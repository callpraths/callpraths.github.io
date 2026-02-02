---
layout: post
title:  "Four ways to freeze the UI thread"
date:   2026-02-02 00:00:00 +0000
style: browser-task-queues
---

... and remedies for the morning after.

<script type="module" src="{{ '/assets/js/article/browser-task-queues/main.js' | relative_url }}"></script>

A frozen UI thread is one of the constant nightmares of application builders, regardless of the underlying platform and
UI framework. For many years, platform developers at [Android][android-jank] and [the Chromium browser][chromium-jank]
have been trying to make it easier for application developers to detect and mitigate jank. Jank can occur both in the
platform (e.g., chromium did something slow) or in the application itself. This post walks you through some ways you, as
a web application developer, could accidentally make your own application janky, and provides remedies.

I will walk through the pitfalls step-by-step with an eye to incrementally building an intuition for asynchronous
JavaScript. To help this be an interactive post, I have written a toy widget - _Chronotes_ - that I'll use throughout
so you can tinker with the ideas being discussed. _Chronotes_ is a simple note-taking "app". It has a text field to  add
a new note, a saved notes list, a sub-second precision clock, and a progress indicator that flashes while a new note is
being "saved to the backend". The clock and the progress indicator will help you notice the smoothness (or lack thereof)
of user interface updates as we proceed through the discussion. Go ahead and try taking some Chronotes yourself!

<x-chronote-container>
<x-chronote id="xc-instant" store="instant"></x-chronote>
</x-chronote-container>

As you can see above, when you add a new note, the progress indicator in the status bar flashes to show that the note is
being saved. Once saved, the note appears in the notes list.

I invite you to temporarily suspend disbelief and follow along as I look over the shoulders of a fellow engineer,
[*Perry*], as he muddles through some soon-to-be-janky UI. Of course, saving a single line of text is unlikely to cause
any performance issues. To make things more interesting, we make Perry's life harder at the outset: Chronotes becomes
super popular (who wouldn't want one, eh?) and the amount of space taken by the notes grows to be too large. Perry
solves this problem by compressing the notes before saving them. Here's what the method that saves the notes looks like
after he adds compression:

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

I will build on this simple method throughout the rest of the post. Significantly, assume that compressing the
notes takes just over 1 second (this makes the effect more visible). Go ahead and play with the updated (worse) example:

<x-chronote-container withLatency="true">
<x-chronote id="xc-sync" store="sync"></x-chronote>
</x-chronote-container>

Perry was prescient enough to report the latency of note compression in his operational metrics. With some luck, Perry's
operational monitoring system will alert him to the issue before the customers come calling. Notice that Chronotes now
displays the latency of the last note addition under the widget so that you can see the latency data reported to Perry's
latency dashboard.

As you play around with Chronotes above, you will notice several problems when you add a note:

- The timer in the app freezes for several seconds.
- The save-in-progress animation freezes as well.
- The reported latency is over 1 second (as expected)

> I highly encourage you to play around with the Chronotes app above, as well as later in this post. I believe that
> you will gain the most with this post if you engage with all the examples. Tinkering is learning.

So, what does Perry do when his latency charts surface the problem? A second is too long for a synchronous
thread-blocking operation on the [browser main thread]. So, Perry makes the `save()` method and the compression
operation asynchronous, as follows:

<p>
{% highlight jsx linenos %}
// ❗Save is now asynchronous.❗
async save(notes) {
    const stopTimer = this.timingReporter.startTimer();
    await this.saveInternal(notes);
    stopTimer();
}

// ❗Make compression asynchronous by wrapping in a promise.❗
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
- The actual compression is pulled out into `async saveInternal()` that wraps the slow `compress()` operation into a
  `Promise`.

Think about what the effect of this change will be, and then play around with the updated widget below to see if your
intuition is on point.

<x-chronote-container withLatency="true">
<x-chronote id="xc-awaited-promise" store="awaitedPromise"></x-chronote>
</x-chronote-container>

No change.

Making the operation asynchronous makes no difference because `save()` still blocks the main thread while it waits for
the `await` to complete. The `await` on line 4 is a synchronization point. `save()` will only proceed beyond line 4
after the promise returned by `saveInternal()` resolves, i.e. after `compress()` completes.

> 📌 In JavaScript, `await` is a synchronization point.
> The caller can only continue after the `await`ed promise resolves.

Knowing that, Perry thinks his best bet is to _no longer_ `await` the compression step. No more synchronization point,
no more waiting, right?

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
add concurrency to a program so that execution can continue when some operations are blocked (e.g., waiting for I/O). But
they are not a reliable way to defer or delay the execution of code.

> 📌 A `Promise` (or equivalently, an `async` function) in JavaScript is not a reliable way to defer or delay code
> execution.

Over in Perry's world, further disaster strikes while he is still scratching his head about the last problem. The
latency dashboard starts showing some weird results as Perry's teammates continue to add other features to the popular
app.

First, a teammate adds some quick preparation code that runs before the compression code, like so:

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
See what happens when you try this out:

<x-chronote-container withLatency="true" withTraceViewer="true">
<x-chronote id="xc-unawaited-prepared-promise" store="unawaitedPreparedPromise"></x-chronote>
</x-chronote-container>

Yay! Reported latency is now closer to 100 milliseconds (the time spent in `prepare()`), which isn't as bad as...
Wait, the UI is _still frozen_ for over a second. The latency numbers are clearly bonkers: how could doing _more_ work
have made things go _faster_?

Next, another teammate adds a `finalize(notes)` call_after the compression step, as shown below:

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

The only change now is an additional quick `finalize()` step after the notes are saved, but before the timer is stopped.
Let's give this a spin next:

<x-chronote-container withLatency="true" withTraceViewer="true">
<x-chronote id="xc-unawaited-finalized-promise" store="unawaitedFinalizedPromise"></x-chronote>
</x-chronote-container>

And... the latency numbers are back over a second, while the stubborn UI freeze stays unchanged.

At this point, Perry is completely lost. The UI freeze bug refuses to go away. That's understandable, as he hasn't
gotten a chance to address it. But his latency dashboards are no longer reliable. Unrelated changes seem to be affecting
the reported latency in unpredictable ways.

Before we dig into why that's happening, try out the tracing panels in the Chronotes widgets above to see if you can get
an intuition to help Perry out.

You will see that the order in which `compress()` and `stopTimer()` are called is different in the two cases. With only
the `prepare()` call, compression is called at the end, after the timer is stopped and `save()` has already returned.
With the addition of `finalize()`, compression moves earlier once again.

This has to do with how the JavaScript engine schedules pending work in the presence of Promises. We saw earlier that
JavaScript schedules Promises greedily. We now see the opposite effect - while the execution of a `Promise` is greedy,
an `await` point (or equivalently, the `.then()` clause of a `Promise`) _always_ causes the rest of the current function
to be deferred as a task to be picked up later. At an `await` point, the JavaScript runtime immediately returns a new
`Promise` from the current function and picks up the deferred work only after all the function calls in the current
execution stack are completed.

In the first listing, upon encountering `await prepare(notes)` , `saveInternal()` returns immediately from line 10,
deferring the work from line 11 to 14 as a task. `save()` is able to continue synchronously and stop the timer. The
derferred task runs after `save()` has returned and incurs the cost of calling `compile()`. The execution order of the
significant lines of code is:

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
// deferred task from saveInternal
11   return new Promise((resolve) => {
12       compress(notes);
13       resolve();
14   });
{% endhighlight %}
</p>

The addition of `finalize()` has the opposite effect, but for the same reason. `saveInternal` returns early from line 11
(in the latter listing), same as above. `save()` then continues execution, but it hits another `await` point on line 5,
after the call to `finalize()`. At this point, the rest of `save()` (lines 6-7) is also deferred, queueing behind the
already deferred task from `saveInternal`. Thus, the tail end of `save()` runs as a second deferred task, after the
deferred task from `saveInternal()` that contains the `compress()` call. The new execution order looks like this:

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

The interleaving of independent concurrent `Promise` chains is dependent on the length of these chains, i.e., the number
of `await` points between the first `await` and the terminal already-resolved `Promise`. When some Promises are left
unawaited, it is unclear what fraction of the subsequent Promises will have been resolved when a `Promise` higher in
the chain resolves. The end result of this is that any latency measurements in parent Promises become unreliable. There
is an important lesson here:

> 📌 Avoid unawaited Promises. They can cause subtle changes in the order of execution of asynchronous code with
> potentially surprising impact on performance measurements.

You may think that you would never make the mistake of leaking a `Promise` if you were in Perry's place. Well then, know
that this example isn't made up. The sequence of events described here happened in almost this order in a production
chat application that I once worked on. This mistake isn't very hard to make because the leaked `Promise` may not be
close to the costly operation, nor the point where latency measurement is made, but hidden somewhere in a long
call-chain between them, as was the case in my production chat app.

My team was (un)lucky enough to also fall prey to Perry's conundrum above. In our app, we had two conflicting latency
measurements reported for the relevant code paths:

- One measured the latency specifically of the costly computation. The latency measurement was added by, and was the
  responsibility of, the team that had added the costly computation. This latency measurement was reporting that
  everything was hunky-dory, like Perry's sub-100 millisecond latency measurement earlier.
- Another latency measurement at a higher level of the stack broadly measured the responsiveness of the application. It
  was reporting high latency numbers (because, as you now understand, there were many intervening `await` points
  that caused the unawaited `Promise` to resolve within the measured span).

These two teams spent months arguing about whether the costly computation was truly to blame or not... until somebody
(*ahem*) dug in to figure out just why we couldn't see eye-to-eye for so long. It bears repeating that unawaited
Promises are dangerous, especially when they look benign enough.

Back to Perry, let us not forget that the UI freeze bug wasn't affected by any of the JavaScript scheduling changes
above. This is because the browser uses a nested queueing architecture where all asynchronous JavaScript tasks are
queued in a _micro-task queue_. The entire JavaScript execution, including finishing all the micro-tasks in the
micro-task queue, is scheduled as a single task on a higher-level _task queue_. It is this _task queue_ that is
scheduled on the main thread. Besides JavaScript, the task queue contains the browser's own tasks, e.g. the task to
update the UI. All the changes Perry and his team have made so far only move the JavaScript execution order within a
single JavaScript task. So, the browser isn't getting a chance to run the UI update task until the JavaScript execution
completes.

For the browser to be able to update the UI, Perry needs to schedule a JavaScript operation in a new _task_. A normal
`Promise` won't do the trick, but there are several browser APIs that can help, e.g., `setTimeout` and
`requestAnimationFrame` create a new _task_ for the JavaScript code to run in. I recommend reading the MDN docs on
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

So... mostly the same, but worse? The note now appears immediately on save, but the UI is frozen right after. The
timer and the saving animation freeze after the note appears in the list.

Can you guess why? Creating a new task only delays the costly work. Yes, it gives the browser a chance to paint the
screen - once - and that is why the note appears in the saved list immediately. But the second-long compression
operation runs right after the browser updates the UI and freezes the UI all over again. You can see the effect of this
also in the trace viewer - the log line `Returning from save()` appears before the UI freezes. The remaining logs
appear more than a second later, after compression is completed.

Finally, Perry realises that there is no quick fix. _If there is a second-long operation on the UI thread, the UI thread
must freeze for over a second_. There's no point moving that work around in the micro-task or task queue. Perry really
has only two options for a fix:

- Move the work off the main thread, perhaps to a [_web worker_]. This is the best way forward if it's an option. The
  downside is complexity: Managing a web worker in an application needs some care, especially when there is a large team
  working on the application - it is unwise for different parts of the application to be launching web workers
  willy-nilly.
- The second, more localized, option is to split up the costly work in smaller batches and schedule each batch as a
  separate task so that other higher-priority tasks from the browser get a chance to run regularly - i.e.
  [cooperative multi-tasking]. This is possible only if there's a way for Perry to estimate how long the computation
  will take and to split up the work into chunks that are guaranteed not to take too long.

Perry opts for cooperative multi-tasking and splits up the compression into 50 parts after looking
at the latency numbers. Each part should be nearly 1000/20 = 50 milliseconds long.

<p>
{% highlight jsx linenos %}
async save(notes) {
    const stopTimer = this.timingReporter.startTimer();

    const partsCount = this.parts;
    let result = new Promise(async resolve => {
        const savePart = (partIndex) => {
            // ❗Blocking, but quicker, compression of a part❗
            compressParts(notes, partsCount, partIndex);
            if (partIndex === partsCount) {
                stopTimer();
                resolve();
            } else {
                //❗Schedule next part.
                setTimeout(() => savePart(partIndex + 1), 0)
            }
        }
        setTimeout(() => savePart(0), 0);
    });
    return result;
}
{% endhighlight %}
</p>

That's a mouthful of code - but the intent is as we already discussed - Perry splits the work into a pre-configured
number of steps and schedules each part as a task. Once a part is compressed, the next part's compression is immediately
scheduled, if there are any left. Had all the parts been scheduled at once, other `setTimeout` calls would have had to
queue behind all 20 parts (e.g., this would block the Chronotes clock from updating because it uses `setTimeout`).

Give Perry's final solution a spin:

<x-chronote-container withLatency="true" withTraceViewer="true">
<x-chronote id="xc-set-timeout-by-parts-promise" store="setTimeoutByParts" parts=20></x-chronote>
</x-chronote-container>

Isn't that a beauty? The note appears in the list immediately, the clock and animation run smoothly during the
compression, and the reported latency of the overall compression is accurate - more than a second - because splitting up
the work does not make it go any faster.

### An aside on web application frameworks

A final note about the toyishness of this example. It is hard to believe that compressing text entered by the user
could take over a second. As I said, this example is inspired by actual issues discovered in a production application.
The slow operation wasn't text compression, but instead the recomputation of the [_React render tree_][react] when
application runtime settings were updated. React took several seconds, burning away the user's CPU, only to determine
that nothing needed to be updated on the screen. It is my position that React makes it too easy for application
developers to write huge applications that freeze as React figures out what part of the screen to update. React can't
effectively offload this computation to a web worker because it's all about DOM updates. React 18 tries to mitigate this
problem somewhat via [concurrent rendering][react-concurrent], which is essentially the same solution that we arrived at
above - split up the costly rendering pass into interruptible chunks so that the browser (or the user!) can get a word
in. I have written before about some of the performance gotchas in React in my post on [React reconciliation].

On balance, after a few years working in the infrastructure team of a heavyweight web application, I would reach
for a less magical framework for web UI than React. I think [`Vue`] is a saner choice. Or, you can go full vanilla and
drop down to the web platform (that's what the web was all about anyway, right?). I wrote `Chronotes` as a
collection of [web components] using the light-weight [`Lit`] library from Google, and this post loads it as
[ESM modules] - no transpilation, no bundler, no magic. See the source code on [this blog's repo][chronotes-repo].
I would recommend a similar approach, at least for small to medium applications.

### Note on LLM usage

I wrote the Chronotes app neraly 2 years ago when the idea of this post first occured to me. That was done without the
use of LLMs because we were still in ~~the last century~~ 2024, and also because I wouldn't learn anything if LLM did
it all. Picking it up again this year, I added a bunch of features, like the _trace viewer_ panel. I used LLMs heavily
for this work. Feature development on an already opinionated codebase is where LLMs really shine. Finally, I can't write
CSS to save my life, so I let the LLM spin on that.

The prose in this post is all mine. I find LLM-driven auto-complete in IDEs like [Google's Antigravity][antigravity]
extremely distracting. Using an LLM to co-write my prose is out of the question - the whole point is for me to tell you
a story. Having somebody (something?) else's voice in the middle does not help. I did use the good old [AI without
any snake oil][ai-snake-oil], i.e., spell check / grammar correction, while copy-editing. Because why wouldn't I?

## Conclusion

As a web developer, you do not often need to think about asynchronous JavaScript's execution model - this is by design.
But the abstraction breaks when you have a chunk of CPU-heavy work occurring on the main thread. I find the
browser's two-level task queueing architecture fascinating, and understanding it is critical if you find yourself
thinking about exactly what's happening when you kick off a `Promise`. To deal with that CPU-heavy workload, you have
three options in a web application:

- Avoid CPU-heavy work. This is a web application. Punt it to the backend or don't do it at all.
- Split it up into smaller chunks scheduled independently. This is what React 18's concurrent mode APIs do.
- Push it onto a _web worker_ thread. This approach is natural for web applications that are fundamentally
  CPU-intensive, like [Google Earth] (on my laptop, it launches 16 web workers that guzzle up my CPUs).

I hope that this post was fun to read & play around with, and left you with added curiosity about the inner workings
of the web platform. Till next time, Cheerios 👋🙃.


[_web worker_]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
[android-jank]: https://developer.android.com/studio/profile/jank-detection
[antigravity]: https://antigravity.google/
[chromium-jank]: https://www.chromium.org/developers/how-tos/trace-event-profiling-tool/anatomy-of-jank/
[*Perry*]: https://www.youtube.com/playlist?list=PLiv1IUQDVSNJVnAPrekpyc39isaJSzi1J
[`Lit`]: https://lit.dev/
[`Vue`]: https://vuejs.org/
[ai-snake-oil]: https://books.google.ca/books/about/AI_Snake_Oil.html?id=Mpbq0AEACAAJ&redir_esc=y
[browser main thread]: https://developer.mozilla.org/en-US/docs/Glossary/Main_thread
[chronotes-repo]: https://github.com/callpraths/callpraths.github.io/tree/976453f897c06e7133e3db207b7879605723e937/assets/js/article/browser-task-queues/components
[cooperative multi-tasking]: https://en.wikipedia.org/wiki/Cooperative_multitasking
[ESM modules]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
[Google Earth]: https://earth.google.com/
[react]: https://react.dev/
[React reconciliation]: https://callpraths.github.io/2022/03/30/react-reconciliation.html
[react-concurrent]: https://react.dev/blog/2022/03/29/react-v18#what-is-concurrent-react
[web components]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components