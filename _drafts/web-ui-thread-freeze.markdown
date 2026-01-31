---
layout: post
title:  "Four ways to freeze the UI thread"
date:   2026-01-30 00:00:00 +0000
style: browser-task-queues
---

<script type="module" src="{{ '/assets/js/article/browser-task-queues/main.js' | relative_url }}"></script>

... and remedies for the morning after.

A frozen UI thread is one of the constant nightmares of application builders, regardless of the underlying platform and
UI framework. For many years, platform developers at [Android](android-jank) and [the Chromium browser](chromium-jank)
have been trying to make it easier for application developers to detect and mitigate jank. Jank can occur both in the
platform (chromium doing something slow) or in the application itself. This post walks you through all the ways you, as
a web application developer, can make your own application janky, and what to do about it.

I will walk through the pitfalls step-by-step with an eye to incrementally build an intuition for asynchronous
JavaScript. To help this be an interactive post, I have written a toy widget - _Chronotes_ - that I'll use throughout
so you can tinker with the ideas being discussed. _Chronotes_ is a simple note-taking "app". It has input element to add
a note, a saved notes list, a sub-second precision clock and progress indicator while a new note is being added. The
clock and the progress indicator will help you notice the smoothness (or lack thereof) of user interface updates as we
proceed through the discussion. Go ahead and try taking some Chronotes yourself!

<x-chronote-container>
<x-chronote id="xc-instant" store="instant"></x-chronote>
</x-chronote-container>

As you can see above, when you add a new note, the progress indicator in the status bar flashes to show that the note is
being saved. Once saved, the note appears in the notes list.

I invite you to temporarily suspend disbelief and follow along as I look over the shoulders of a fellow engineer,
[*Perry*], as he muddles through some soon-to-be-janky UI. Of course, saving a single line of text does not take any
time. To make things more interesting, let's make Perry's life harder at the outset: Chronotes becomes super popular
(who wouldn't want one, eh?) and the amount of space taken by the notes grows to be too much. Perry solves this problem
by compressing the notes before saving them. Here's what the method that saves the notes looks like with compression:

<p>
{% highlight jsx linenos %}
save(notes) {
    const stopTimer = this.timingReporter.startTimer();
    // ❗Text compression in our example takes ~4 seconds 😲❗
    compress(notes);
    stopTimer();
}
{% endhighlight %}
</p>

It's a simple method that we'll build upon through the rest of the post. Signficantly, we assume that compressing the
notes takes nearly 4 seconds (makes the effect more visible). We can see that Perry was prescient enough to report the
latency of note compression. You and I know he's in for a rude surprise, but at least he'll have the latency data in
his operational dashboard to alert him!

Go ahead and play with the updated (worse) example:

<x-chronote-container withLatency="true">
<x-chronote id="xc-sync" store="sync"></x-chronote>
</x-chronote-container>

Notice that Chronotes now displays the latency of the last note addition under the app, as reported to Perry's latency
dashboard. As you play around with Chronotes, you'll notice several problems when you add a note:

- The timer in the app freezes for several seconds.
- The save-in-progress animation freezes as well.
- Latency reported is 4 seconds (this is expected).

> I highly encourage you to plary around with the Chronotes app above, as well as later in the discussion. Tinkering is
> learning.

So, what does Perry do when his latency charts surface the problem? Well, 4 seconds is too long for a synchronous
thread-blocking operation on the [browser main thread]. So, Perry makes the `save()` method and the compression
asynchronous, as follows:

<p>
{% highlight jsx linenos %}
// ❗Save is now asynchronous.❗
async save(notes) {
    const stopTimer = this.timingReporter.startTimer();
    await this.saveInternal(notes);
    stopTimer();
}

// ❗Make compression asychronous by wrapping in a promise.❗
async saveInternal(notes) {
    return new Promise((resolve) => {
        compress(notes);
        resolve();
    });
}
{% endhighlight %}
</p>


A lot has changed in the code listing, so let's break it down:
- `save()` is now marked `async` so it can return a `Promise`.
  The click handler for the save button (not shown) now calls `await save()` to save the note.
- The actual compression is pulled out into `async saveInternal()` that wrapps the
  the slow `compress()` operation into a `Promise`.

Think about what the effect of this change will be and then play around with the updated widget below to see if your
intution is on point.

<x-chronote-container withLatency="true">
<x-chronote id="xc-awaited-promise" store="awaitedPromise"></x-chronote>
</x-chronote-container>

No change.

Making the operation asynchronous makes no difference because `save()` still blocks the main thread while it waits for
the `await` to complete. The `await` on line 4 is a synchronization point. `save()` will only proceed beyond line 4
after the promise returned by `saveInternal()` resolves, i.e. after `compress()` completes.

> 📌 In JavaScript, `await` is a synchronization point.
> The caller can only continue after the `await`ed promise resolves.

Next, Perry thinks his best bet is to _no longer_ `await` the compression step. No more synchronization point, no more
waiting, right?

<p>
{% highlight jsx linenos %}
async save(notes) {
    const stopTimer = this.timingReporter.startTimer();
    // ❗`saveInternal` returned a `Promise` that we did not `await`❗
    const result = this.saveInternal(notes);
    stopTimer();
    // ❗We still stopped the timer before returning❗
    return result;
}

async saveInternal(notes) {
    return new Promise((resolve) => {
        compress(notes);
        resolve();
    });
}
{% endhighlight %}
</p>

The change from the earlier listing is small: the `Promise` returned from `saveInternal()` is no
longer awaited. The timer is still stopped at the same point in the body of `save()`.

So, does this solve Perry's problem?

<x-chronote-container withLatency="true" withTraceViewer="true">
<x-chronote id="xc-unawaited-promise" store="unawaitedPromise"></x-chronote>
</x-chronote-container>

Still no change!

Hmm... what gives? To understand why there is no change, let's take a look at the order in which the different
statements are executed when `save()` is called. Open the new _Trace Viewer_ panel on the right side of the
Chronotes widget above and add another note to see a trace of the statements in the `save()` method.

The trace shows log statements issued from various points in the code listing. As we'd expect from the observed
behavior, the `compress()` method is called before both (a) the `stopTimer()` method is called, and (b) the `save()`
method returns.

The key insight is that the `Promise` returned by `saveInternal()` _executes immediately and synchronously_ before the
execution in `save()` continues beyond line 4 even though there is no `await` on line 4. This is so because Promises in
JavaScript are _greedy_ in the sense that their executor functions run immediately when the `Promise` is created. They
add concurrency to a program so that execution can continue when some operations are blocked (e.g. waiting for I/O). But
they are not a reliable way to defer or delay execution of code.

> 📌 A `Promise` (or equivalently, an `async` function) in JavaScript is not a reliable way to defer or delay code
> execution.

Over in Perry's world, further disaster strikes while he is still scratching his head about the last problem. The
latency dashboard start showing some weird results as Perry's teammates continue to add unrelated features to the app.

First, a teammates adds some quick preparation code that runs before the compression code, like so:

<p>
{% highlight jsx linenos %}
async save(notes) {
    const stopTimer = this.timingReporter.startTimer();
    const result = this.saveInternal(notes);
    stopTimer();
    return result;
}

async saveInternal(notes) {
    // ❗A quick operation (< 100 milliseconds)❗
    await prepare(notes);
    return new Promise((resolve) => {
        compress(notes);
        resolve();
    });
}
{% endhighlight %}
</p>

The only change here is the new `await prepare(notes)` call, which takes less than 100 milliseconds to complete.
Let's see what happens when we try this out:

<x-chronote-container withLatency="true" withTraceViewer="true">
<x-chronote id="xc-unawaited-prepared-promise" store="unawaitedPreparedPromise"></x-chronote>
</x-chronote-container>

Yay! Reported latency is now closer to 100 milliseconds (the time spent in `prepare()`) which isn't as bad as...
wait, the UI is _still frozen_ for 4 seconds. And anyway, there's no way doing _more_ work can make things go _faster_, right?

Next, another teammate adds a `finalize(notes)` call _after_ the compression step, as shown below:

<p>
{% highlight jsx linenos %}
async save(notes) {
    const stopTimer = this.timingReporter.startTimer();
    const result = this.saveInternal(notes);
    // ❗Another quick operation (< 100 milliseconds)❗
    await finalize(notes);
    stopTimer();
    return result;
}

async saveInternal(notes) {
    await prepare(notes);
    return new Promise((resolve) => {
        compress(notes);
        resolve();
    });
}
{% endhighlight %}
</p>

The only change now is an additional quick `finalize()` step after the notes are saved but before the timer is stopped.
Let's give this a spin next:

<x-chronote-container withLatency="true" withTraceViewer="true">
<x-chronote id="xc-unawaited-finalized-promise" store="unawaitedFinalizedPromise"></x-chronote>
</x-chronote-container>

And... the the UI freeze stays unchanged while the latency is back to 4 seconds!

At this point, Perry is completely lost. The UI freeze bug refuses to go away. That's understandable as he hasn't gotten
a chance to address it. But his latency dashboards are no longer reliable. Unrelated changes seem to be affecting the
reported latency in unpredictable ways.

Before we dig into why that's happening, try out the tracing panels in the Chronotes widgets above to see if you can get
an intuition to help Perry out.

You will see that the order in which `compress()` and `stopTimer()` are called is different in the two cases. With only
the `prepare()` call, compression is called at the end, after the timer is stopped and `save()` has already returned.
With the addition of `finalize()`, compression moves earlier once again.

This has to do with how the JavaScript engine schedules pending work in the presense of Promises. We saw earlier that
JavaScript schedules Promises greedily. We now see the opposite effect - while the execution of a `Promise` is greedy,
an `await` point (or equivalently, the `.then()` clause of a `Promise`) _always_ causes the rest of the current function
to be deferred as a task to be picked up later. At an `await` point, the Javascript runtime immediately returns a new
`Promise` from the current function and picks up the deferred work only after all the function calls in the current
stack trace complete.

Upon encountering `await prepare(notes)` , `saveInternal()` returned immedaitely from line 10, deferring the work from
line 11 to 14 as a task. `save()` is able to continue synchronously and stop the timer. The derferred task runs after
`save()` has returned and incurred the 4 second cost of calling `compile()`. The execution order of the significant
lines of code is:

<p>
{% highlight jsx %}
// call to save()
2    const stopTimer = this.timingReporter.startTimer();
3    const result = this.saveInternal(notes);
// call to saveInternal()
10   await prepare(notes);
// suspended return from saveInternal()
4    stopTimer();
5    return result;
// defered task from saveInternal
11   return new Promise((resolve) => {
12       compress(notes);
13       resolve();
14   });
{% endhighlight %}
</p>

Addition of `finalize()` has the opposite effect, but for the same reason. `saveInternal` returns early from line 11,
same as above. `save()` then continues execution but it hits another `await` point on line 5 after the call to
`finalize()`. At this point, the rest of `save()`, lines 6-7, is also deferred, queueing behind the already deferred
task from `saveInternal`. Thus, the tail end of `save()` runs as a second deferred task, after the deferred task from '
`saveInternal()` that contains the `compress()` call. The new execution order now looks like:

<p>
{% highlight jsx %}
// call to save()
2    const stopTimer = this.timingReporter.startTimer();
3    const result = this.saveInternal(notes);
// call to saveInternal()
11   await prepare(notes);
// suspended return from saveInternal()
5    await finalize(notes);
// defered task from saveInternal
12   return new Promise((resolve) => {
13       compress(notes);
14       resolve();
15   });
// deferred task from save();
6    stopTimer();
7    return result;
{% endhighlight %}
</p>

The interleaving of independent concurrent `Promise` chains is dependent on the length of these chains (i.e.) how many
`await` points there are from the first `await` to the terminal already-resolved `Promise`. When some Promises are left
unawaited, it is unclear what fraction of the subsequent Promises will have been resolved when a `Promise` higher in
the chain resolves. The end result of this is that any latency measurements in parent Promises become unreliable. There
is an important lesson here:

> 📌 Avoid unawaited Promises. They can cause subtle changes in the order of execution of asynchronous code with
> surprising impact on performance measurements.

You may think that you would never make the mistake of leaking a `Promise` like that if you were in Perry's place. Well
then, know that this example ain't made up. The sequence of events we're walking through happened in almost this order
in a production chat application that I once worked on. In fact, this mistake isn't very hard to make because the leaked
`Promise` may not be close to the costly operation, nor the point where latency measurement is made, but hidden
somewhere in a long call-chain between them - as was the case in my production chat app.

My team was (un)lucky enough to also fall prey to Perry's conundrum above. In our app we had two different latency
measurements reported for the relevant code paths at the same time:

- One measured the latency specifically of the costly computation. The latency measurement was added by and was the
  responsibility of, the team that had added the costly computation. This latency measurement was reporting that
  everything was hunky-dory, like Perry's latency measurement earlier.
- Another latency measurement at a higher level of the stack that broadly measured the responsiveness of the application
  was instead reporting high latency numbers (because, as we now understand there were many intervening `await` points
  that caused the unawaited `Promise` to resolve within the measured span).

These two teams spent months arguing about whether the costly computation was truly costly or not... until somebody
(*ahem*) dug in to figure out just why we couldn't see eye-to-eye for so long. It bears repeating that unawaited
Promises are extremely dangerous, especially when they look benign enough.

Back to Perry, let us not forget that the UI freeze bug wasn't affected by any of the JavaScript scheduling changes
above. This is because the browser uses a nested queueing architecture where all asynchronous JavaScript tasks are
queued in a _micro-task queue_ and the entire JavaScript execution, including finishing all the micro-tasks in the
micro-task queue, is scheduled as a single task on a higher level _task queue_. It is this _task queue_ that is
scheduled on the main thread. Besides JavaScript, the task queue contains browser's own tasks, e.g. the task to update
the UI. All the changes Perry and hist team made above only moved the JavaScript execution order within a single
JavaScript task. So, the browser never got a chance to run the UI update task until the JavaScript execution completed,
and that included the slow compression operation.

In order for the browser to get a chance to update the UI, Perry needs to schedule JavaScript operation in a new _task_.
A normal `Promise` won't do the trick, but there are several browser APIs that can help, e.g. `setTimeout` or
`requestAnimationFrame`, that create a new _task_ for the JavaScript code to run in. I recommend reading the MDN docs on
[Tasks and Microtasks](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop#tasks_and_microtasks) for a
more in-depth explanation.

Perry reads the docs and decides to throw in a `setTimeout` to see if that sticks:

<p>
{% highlight jsx linenos %}
async save(notes) {
    const stopTimer = this.timingReporter.startTimer();
    if (this.saveTimerHandle) {
        clearTimeout(this.saveTimerHandle);
    }
    return new Promise((resolve) => {
        // ❗Create a task instead of a micro-task❗
        this.saveTimerHandle = setTimeout(() => {
            compress(notes);
            this.saveTimerHandle = undefined;
            stopTimer();
            resolve();
        }, 0);
    });
}
{% endhighlight %}
</p>

And here's the result:

<x-chronote-container withLatency="true" withTraceViewer="true">
<x-chronote id="xc-set-timeout-promise" store="setTimeout"></x-chronote>
</x-chronote-container>

So... mostly the same, but worse? The note now appears immedately on save, but the UI is frozen right after (both the
timer and the saving animation freeze after the note appears in the list).

Can you guess why? Creating a new task only delayed the costly work. Yes, it did give the browser a chance to paint the
screen - once - and that is why the note appeared in the saved list. But the 4 second compression operation ran right
after the browser updated the UI and it froze the UI all over again. You can see the effect of this also in the trace
viewer above - the log line `Returning from save()` appears before the UI freezes. The remaining logs appear 4 seconds
later, after compression is completed.

Finally, Perry realises that there is no quick fix. _If there is a 4 seconds-long operation on the UI thread, the UI thread
must freeze for 4 seconds_. There's no point moving that work around in the micro-task or task queue. Perry really has
only two options for a fix:

- Move the work off the main thread, perhaps to a [_web worker_]. This is the best way forward if it's an option. I'll
  call out though that managing a web worker in an application can add some amount of complexity to the implementation
  and needs some care, especially when there is a large team working on the application - it is unwise for different
  parts of the application to be launching web workers willy-nilly.
- The second, more localized, option is to split up the costly work in smaller batches and schedule each batch as a
  separate task so that other higher-priority tasks from the browser get a chance to run regularly - i.e.
  [cooperative multi-tasking]. This is possible only if there's a way for Perry to estimate how long the computation
  will take and to split up the work into chunks that are guaranteed to not take too long.

In our example, Perry opts for cooperative multi-tasking and splits up the compression into 50 parts after looking
at the latency numbers. Each part should be ~4/50 = 80 milliseconds long.

<p>
{% highlight jsx linenos %}
async save(notes) {
    const stopTimer = this.timingReporter.startTimer();
    this.saveTimerHandles.forEach(
        (handle) => handle && clearTimeout(handle)
    );
    return new Promise(async resolve => {
        await Promise.all(
            // ❗Preconfigured number of parts to split work into❗
            [...Array(this.parts).keys()].map(
                (i) =>
                    new Promise((resolve) => {
                        this.saveTimerHandles[i] = setTimeout(() => {
                            // ❗Blocking, but quicker, compression of a part❗
                            compressParts(notes, this.parts, i);
                            this.saveTimerHandles[i] = undefined;
                            resolve();
                        }, 0);
                    })
            )
        );
        stopTimer();
        resolve();
    });
}
{% endhighlight %}
</p>

That's a mouthful of code - but the intent is as we already discussed - Perry splits the work into a pre-configured
number of steps and schedules each part as a task. He scheudles all 50 tasks in one go. The browser will still be able
to paint between the scheduled tasks because unlike the micro-task queue, the task queue does not strictly follow a
first-in-first-out policy. The browser retains the freedom to intersperse scheduled JavaScript tasks with other higher
priority tasks, like painting the screen and advancing animations.

Give Perry's final solution a spin:

<x-chronote-container withLatency="true" withTraceViewer="true">
<x-chronote id="xc-set-timeout-by-parts-promise" store="setTimeoutByParts" parts=50></x-chronote>
</x-chronote-container>

Isn't that a beauty? The note appears in the list immediately, the clock and animation run smoothly while the compression is
in progress, and the reported latency of the overall compression is accurate - over 4 seconds because splitting up the
work does not make it go any faster.

### An aside on web application frameworks

One final note about the toyishness of this example. It is hard to believe that compressing text entered by the user
could take over 4 seconds. As I said, this example is inspired by actual issues discovered in a production application.
The slow operation wasn't text compression, but instead the recomputation of the [_React render tree_][react] when some
application runtime settings were updated. React took several seconds burning away the CPU only to determine that
pretty-much nothing needed to be updated on the screen. I think that React makes it too easy for application  developers
to write huge applications that freeze as React tries to figure out what part of the screen to update. Also, this is
computation that React can't offload to a web worker because it's all about DOM updates. React 18 tries to mitigate this
problem somewhat via [concurrent rendering][react-concurrent], which is essentially the same solution that we arrived at
above - split up the costly rending pass into interruptible chunks so that the browser (or the user!) can get a word in.
I have written before about some of the performance gotchas in React in my post on [React reconciliation].

On the balance, after a few years working in the infrastructure team of a heavy-weight web application, I would reach
for a less magical framework for web UI than React. I think [`Vue`] is a saner choice. Or, you can go full vanilla and
drop down the the web platform (that's what the web was all about always, right?). I wrote `Chronotes` as a collection
of [web components] using the light-weight [`Lit`] library from Google and load them as [ESM modules] - no
transpilation, no bundler, no magic. See the source code on [this blog's repo][chronotes-repo]. I would recommend a
similar approach, at least for small to medium applications.

### Note on LLM usage

I wrote the Chronotes app ~2 years ago when the idea of this post first occured to me. That was done without the use of
LLMs because we were still in ~~the last century~~ 2024, and also because I don't learn anything if LLM does it all.
Picking it up again I added a bunch of features, like the _trace viewer_ panel. I used LLMs heavily for this work.
Feature development on an already opinionated codebase are where LLMs really shine. Also, I can't write CSS to save my
life, so I let the LLM spin on that (and spin it did, even for tiny layout changes. LLMs are _not_ up to scratch on
getting CSS layout right yet, me thinks).

The prose in this post is all mine. I find LLM-driven auto-complete in IDEs like [Google's Antigravity][antigravity]
extremely distracting. Using an LLM to co-write my prose is out of the question - the whole point is for me to tell you
a story. Having somebody (something?) else's voice in the middle does not help.

I did heavily use the good old AI without [any snake oil][ai-snake-oil], i.e. spell check / grammar correction, while
copy-editing. Because why wouldn't I?

## Conclusion

As a web developer, you do not often need to think about asynchronous JavaScript's execution model - this is by  design.
But the [leaky abstraction] breaks when you have a chunk of CPU-heavy work occuring on the main thread. I find the
browser's two-level task queueing archiecture fascinating, and undrestanding it is critical if you find yourself
thinking about exactly what's happening when you kick off a `Promise`. To deal with that CPU-heavy workload, you have
three options in a web application:

- Avoid CPU-heavy work. This is a web application right? Punt it to the backend / don't do it at all.
- Split it up into smaller chunks scheduled independently. This is what React 18's concurrent mode APIs do.
- Push it onto a _web worker_ thread. This approach is natural for web applications that are fundamentally
  CPU-intensive, like [Google Earth] (on my laptop, it launches 16 web workers that guzzle up my CPUs).

I hope that this post was fun to read & play around with, and left you with added curiosity about the inner workings
of the web platform. 'till next time, cheerios 👋🙃.


[_web worker_]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
[android-jank]: https://developer.android.com/studio/profile/jank-detection
[antigravity]: https://antigravity.google/
[chromium-jank]: https://www.chromium.org/developers/how-tos/trace-event-profiling-tool/anatomy-of-jank/
[*Perry*]: https://www.youtube.com/playlist?list=PLiv1IUQDVSNJVnAPrekpyc39isaJSzi1J
[`Lit`]: https://lit.dev/
[`Vue`]: https://vuejs.org/
[ai-snake-oil]: https://books.google.ca/books/about/AI_Snake_Oil.html?id=Mpbq0AEACAAJ&redir_esc=y
[browser main thread]: https://developer.mozilla.org/en-US/docs/Glossary/Main_thread
[chronotes-repo]: https://github.com/callpraths/callpraths.github.io/tree/5ab23b81d3b3881186ee4ad43384f2f537104abf/assets/js/article/browser-task-queues/components
[cooperative multi-tasking]: https://en.wikipedia.org/wiki/Cooperative_multitasking
[ESM modules]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
[Google Earth]: https://earth.google.com/
[leaky abstraction]: https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/
[react]: https://react.dev/
[React reconciliation]: https://callpraths.github.io/2022/03/30/react-reconciliation.html
[react-concurrent]: https://react.dev/blog/2022/03/29/react-v18#what-is-concurrent-react
[web components]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components