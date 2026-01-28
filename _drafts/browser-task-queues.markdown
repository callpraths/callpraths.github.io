---
layout: post
title:  "Browser task queues"
date:   2026-01-28 00:00:00 +0000
style: browser-task-queues
---

<script type="module" src="{{ '/assets/js/article/browser-task-queues/main.js' | relative_url }}"></script>
<script defer type="module"
    src="{{ '/assets/js/article/browser-task-queues/perf-chart.js' | relative_url }}"></script>

    TODO(prprabhu) - Introduction

For the discussion here, I wrote a toy chronological notes taking widget - `chronotes`. It's a simple web component[^1]
where you can take notes that are tagged with the time the note was taken. In addition to an input box for adding a note
and a list of the saved notes, the widget contains a clock and progress indicator. These UI elements will help you notice
the smoothness (or lack thereof) of UI updates in the examples below. Go ahead and try taking some `chronotes` yourself!

<div style="display: block; width: 20rem; height: 15rem">
<x-chronote id="xc-instant" store="instant"></x-chronote>
</div>

As you can see above, when you add a new note, the progress indicator in the status bar flashes to show that the note
is being saved. Once saved, the note appears in the notes list. Of course, saving a single line of text does not really
take any time. I invite you to suspend your disbelief and follow along as I look over the shoulders of a fellow engineer
as they try to tackle this slow save operation.

To make things more interesting, let's make our fellow engineer, Platypus', life harder at the outset. Let's say that `chronotes` becomes super popular (who wouldn't want one, eh?) and the amount of space taken by the notes grows too much.
Platypus solves this problem by compressing the notes before saving them. Here's what the method that saves the notes looks like now:

<p>
{% highlight jsx linenos %}
save(notes) {
    const stopTimer = this.timingReporter.startTimer(
        "sync-note-store-save"
    );
    compress(notes);
    stopTimer();
}
{% endhighlight %}
</p>


<div style="display: block; width: 20rem; height: 15rem">
<x-chronote id="xc-sync" store="sync"></x-chronote>
</div>



[^1]: TODO(prprabhu) Footnote about web component.
