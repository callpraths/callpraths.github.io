---
layout: post
title:  "Browser task queues"
date:   2026-01-28 00:00:00 +0000
style: browser-task-queues
---

<script type="module" src="{{ '/assets/js/article/browser-task-queues/main.js' | relative_url }}"></script>

    TODO(prprabhu) - Introduction

For the discussion here, I wrote a toy chronological notes taking widget - _Chronotes_. It's a simple web component[^1]
where you can take notes that are tagged with the time the note was taken. In addition to an input box for adding a note
and a list of the saved notes, the widget contains a clock and progress indicator. These UI elements will help you notice
the smoothness (or lack thereof) of UI updates in the examples below. Go ahead and try taking some Chronotes yourself!

<div style="display: block; width: 20rem; height: 15rem">
<x-chronote id="xc-instant" store="instant"></x-chronote>
</div>

As you can see above, when you add a new note, the progress indicator in the status bar flashes to show that the note
is being saved. Once saved, the note appears in the notes list. Of course, saving a single line of text does not really
take any time. I invite you to suspend your disbelief and follow along as I look over the shoulders of a fellow engineer,
[*Perry*], as they try to tackle this slow save operation.

To make things more interesting, let's make Platypus' life harder at the outset. Let's say that Chronotes becomes
super popular (who wouldn't want one, eh?) and the amount of space taken by the notes grows too much.
Platypus solves this problem by compressing the notes before saving them. Here's what the method that saves the notes looks like now:

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

It's a simple method that we'll build upon throught this example. Stretching how long operations take, our examples will
assume that compressing the notes takes nearly 4 seconds (to make the effect more visible).

Perry was prescient enough to report the latency of note compression because they anticipated the operation to be slow.
You and I know they're in for a rude surprise, but at least they'll have the latency data in their operational dashboard
to go off of.

Go ahead and play with the updated (worse) example:

<x-chronote-with-latency>
<x-chronote id="xc-sync" store="sync"></x-chronote>
</x-chronote-with-latency>

Notice that the example now displays the latency of the last note addition under the Chronotes app, as reported to Perry's latency dashboard. As you play around with Chronotes above, you'll notice several problems when you add a note:

- The timer in the app freezes for several seconds.
- The save-in-progress animation freezes as well.
- Latency reported is 4 seconds (this is expected).

So, what does Perry do? Well, 4 seconds is too long for a synchronous thread-blocking operation on the [browser main thread].
So, Perry makes the `save()` method and the compression asynchronous, as follows:

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
    // ❗A quick operation (< 100 milliseconds)❗
    // ❗Makes sure this method is truly async❗
    await prepare(notes);
    return new Promise((resolve) => {
        compress(notes);
        resolve();
    });
}
{% endhighlight %}
</p>

A lot has changed in the code listing, so let's break it down:
- `save()` is now marked `async` so it can return a `Promise`.
  The click handler for the save button now calls `await save()` to save the note.
- The actual compression is pulled out into `async saveInternal` that wrapps the
  the costly call to `compress()` into a `Promise`. It also `await`s a cheap
  operation `prepare(notes)`. This extra `await` makes sure that this method is
  truely an asynchronous operation (that the browser doesn't must run it inline
  with the calling code).

Think about what the effect of this change will be and then play around with the updated widget below to see if your
intution is on point.

<x-chronote-with-latency>
<x-chronote id="xc-awaited-promise" store="awaitedPromise"></x-chronote>
</x-chronote-with-latency>

No change. This is not surprising: simply making an operation asynchronous makes no difference since `save()` still
waits for the comporession to complete.

    TODO(prprabhu) Introduce microtask queue, but as a task queue.

OK... so Perry thinks their best bet is to _no longer_ `await` the compression step.

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
        await prepare(notes);
        return new Promise((resolve) => {
            compress(notes);
            resolve();
        });
    }
{% endhighlight %}
</p>

The change here is smaller. The `Promise` returned from `saveInternal()` is no
longer `await`ed. The timer is still stopped at the same point in the body of `save()`.
That will fix things, right? Try it out for yourself:

<x-chronote-with-latency>
<x-chronote id="xc-unawaited-promise" store="unawaitedPromise"></x-chronote>
</x-chronote-with-latency>

Yay! Reported latency is now closer to 100 milliseconds (the time spent in `prepare()`) which isn't as bad as...
Wait. The UI is _still frozen_ for 4 seconds.

What's up? The reduction in the measured latency is easy to explain - we now stop the timer before the `saveInternal` `Promise` is `await`ed, so the time spent inside `saveInternal` is no longer measured. But why is the UI still frozen?

    TODO(prprabhu) Introduce task queue vs. micro task queue.
    Tip: Leaked promises are scary - you may not measure what you think you measure.


You may think that this example is made up and you would never make the mistake of leaking a `Promise` like that if you
were in Perry's place. Well then, know that this example ain't made up. The sequence of events we're walking through
happened in almost this order in a production chat application that I shall not name names of. In fact, this mistake
isn't very hard to make because the leaked `Promise` may not be close to the costly operation, or the point where latency
measurement is made, but hidden somewhere in a long call-chain between them - as was the case in the production application
I was working on.

This gets even more interesting though (and it did for my team) when bugs magically appear / disappear. While Perry is
still scratching their head about what is going on, another innocent change is made to the code by another member of the team:

<p>
{% highlight jsx linenos %}
async save(notes) {
    const stopTimer = this.timingReporter.startTimer();
    const result = this.saveInternal(notes);
    // ❗Another cheap operation added here (< 100 milliseconds)❗
    await finalize(notes);
    stopTimer();
    return result;
}
{% endhighlight %}
</p>

The only change is an additional fast `finalize()` step after the notes are saved but before the timer is stopped. It doesn't matter to us what `finalize()` does, except that it takes less than 100 milliseconds to complete. I've elided `saveInternal()` in the listing because it is unchanged.

We do not expect any difference to the UI freeze bug due to this change. But what do you think will happen to the reported latency? Try it out:

<x-chronote-with-latency>
<x-chronote id="xc-unawaited-finalized-promise" store="unawaitedFinalizedPromise"></x-chronote>
</x-chronote-with-latency>

Instead of rising by ~100 milliseconds to account for the extra operation, latency jumps back to over 4 seconds! Somehow... the micro-task that contains the call to `stopTimer()` is now once again running after the micro-task with the call to `compress()`. Let's look at our micro-task queue again to understand why:

    TODO(prprabhu) - learning: Promises are greedy.

Once again, this situation is not theoretical. A similar change (with several layers of abstractions and interveaning teams involved) was shipped in my production chat app, leading to general confusion and several hours of meeting time getting folks to agree on
there being a problem in the first place. My situation was even worse: There were two different latency measurements being reported

- One measured the latency specifically of the costly computation. The latency measurement was added by and was the responsibility of
  the team that had added the costly computation. This latency measurement was reporting that everything was hunky-dory, like Perry's
  latency measurement earlier.
- Another latency measurement at a higher level of the stack that broadly measured the responsiveness of the application was always
  reporting high latency numbers (because, as we now understand there were many intervening micro-tasks that caused it to capture the
  costly micro-task).

These two teams spent months arguing about whether the costly computation was truly costly or not... until one day a change like
the one Perry was just hit by got made, and the more specific latency measurement also spiked. It bears repeating that un`await`ed `Promise`s are extremely dangerous, especially when they look benign enough.

Back to Perry's problem, they now know that they need to give the browser a chance to paint the screen. Their performance numbers are
also reporting the true latency now, so that they can try to fix the situation and hope to see an improvement on their dashboards. They
reach for `setTimeout` as that creates a new task instead of a micro-task:

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

My hopes are not high that this will help. Try it out anyways:

<x-chronote-with-latency>
<x-chronote id="xc-set-timeout-promise" store="setTimeout"></x-chronote>
</x-chronote-with-latency>

So... mostly the same, but worse? The note now appears immedately on save, but the UI is frozen right after (both the
timer and the saving animation freeze after the note appears in the list). Creating a new task only moved the costly work
around. Yes, it did give the browser a chance to paint the screen - once - and that is why the note appeared in the saved
list. But the 4 second compression operation ran right after and froze the UI all over again:

    TODO(prprabhu) New tasks view.

Finally, Perry realises that there is no quick fix. If there is a 4 seconds-long operation on the UI thread, the UI thread
must freeze for 4 seconds. There's no point moving that work around in the micro-task queue or task queue. Perry has only
two options for a fix:

- Move the work off the main thread, perhaps to a [_web worker_]. This is the best way forward when it's an option. I'll call out though that managing a web worker in an application can add some amount of complexity to the implementation and needs some care, especially when there is a large team working on the application - it is unwise for different parts of the application to be launching web workers willy-nilly.
- The second, more localized, option is to split up the costly work in smaller batches and schedule each batch as a task so that other tasks get a chance to run routinely - i.e. [cooperative multi-tasking]. This is possible only if there's a way for Perry to estimate how long the computation will take and to split up the work into chunks that are guaranteed to not take too long.

In our example, Perry opts for cooperative multi-tasking and splits up the compression into smaller parts:

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

That's a mouthful of code - but the intent is as we already discussed - Perry splits the work into a pre-configured number of steps
and schedules each part as a task. Note that he is able to schedule all the work at the same time. The browser will still be able
to paint between the scheduled tasks. The browser guarantees that the created tasks will all run in order, but is free to intersperse the tasks with other higher-priority work, like painting the screen and advancing animations.

Give Perry's final solution a spin:

<x-chronote-with-latency>
<x-chronote id="xc-set-timeout-by-parts-promise" store="setTimeoutByParts" parts=50></x-chronote>
</x-chronote-with-latency>

Isn't that a beauty? The note appears in the list immediately, the clock and animation run smoothly while the compression is
in progress, and the reported latency of the overall compression is accurate - over 4 seconds because splitting up the
work did not make it any faster.

### An aside on web application frameworks

One final note about the toyishness of this example. It is hard to believe that compressing text entered by the user could
take over 4 seconds. As I said, this example is inspired by actual issues discovered in a production application. The slow
operation wasn't text compression, but instead the recomputation of the _React render tree_ when some application runtime
settings were updated. It truly took several seconds for React to burn away the CPU only to determine that mostly nothing
needed to be updated on the screen. _React_ is notorious for making it too easy for application developers to write behemoths
that freeze as _React_ tries to figure out what part of the screen to update. Worse, this is computation that can't be
offloaded to a web worker because it's all about DOM updates. React 18 tries to mitigate this problem somewhat via [concurrent rendering][react-concurrent], which is essentially the same solution that we arrived at above - split up the costly rending pass into interruptible chunks so that the browser (or the user!) can get a word in. I have written before about some of the performance gotchas in React in my post on [React reconciliation].

On the balance, after a few years working in the infrastructure team of a heavy-weight web application, I would reach for a less
magical framework for web UI. I think [`Vue`] is a saner choice. Or, you can go full vanilla and drop down the the web platform
(that's what the web was all about always, right?). I wrote `Chronotes` as a collection of [web components] using the light-weight [`Lit`] library from Google and load them as [ESM modules] - no transpilation, no bundler, no magic. See the source code on [this blog's repo][chronotes-repo]. I would recommend a similar approach for small to medium applications.

[ESM modules]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
[`Vue`]: https://vuejs.org/
[web components]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components
[`Lit`]: https://lit.dev/
[chronotes-repo]: https://github.com/callpraths/callpraths.github.io/tree/5ab23b81d3b3881186ee4ad43384f2f537104abf/assets/js/article/browser-task-queues/components
[react-concurrent]: https://react.dev/blog/2022/03/29/react-v18#what-is-concurrent-react
[React reconciliation]: https://callpraths.github.io/2022/03/30/react-reconciliation.html
[*Perry*]: https://www.youtube.com/playlist?list=PLiv1IUQDVSNJVnAPrekpyc39isaJSzi1J
[browser main thread]: https://developer.mozilla.org/en-US/docs/Glossary/Main_thread
[_web worker_]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
[cooperative multi-tasking]: https://en.wikipedia.org/wiki/Cooperative_multitasking
[^1]: TODO(prprabhu) Footnote about web component.
