---
layout: post
title:  "A TUI for Hyperfine"
date:   2026-01-28 00:00:00 +0000
---

A hack that's been at the back of my mind ever since my post on [performance comparison between two Rust geospatial libraries][geo-geos-perf-study] was to augment [_hyperfine_] with a [text-based user interface (TUI)][tui] to better visualize the ongoing benchmarking in the terminal. Tl;dr on _hyperfine_: It's a command-line tool that allows you to benchmark, primarily the runtime, of commands at the terminal. It is feature-rich, and I highly recommend it as the first tool to reach for if you're measuring the runtime of programs - from ad hoc measurements all the way to productionized continuous-integration systems.

If you read my performance comparison study, you'll see that I drew plots to visualize the benchmark data, especially geared towards comparing the two programs under study. I found myself wishing for these two features in hyperfine:

1. Interleaved execution of commands to reduce systemic error from environment drift over time. This is a common request from _hyperfine_ and the maintainer expects this [to be available in the future][hyperfine-interleaving-issue].
2. A way to visualize the benchmark results in the terminal _while the benchmark is executing_. _hyperfine_ already includes flags to dump benchmark data as structured results and post-processing scripts to visualize the data as plots. But it is oh-so-satisfying to see the benchmark results come hot off the oven!

Here's my quick hack to scratch the second itch:

{:refdef: style="text-align: center;"}
![](/assets/article_images/misc/hyperfine-tui-hack-bnb.gif)
{: refdef}

Beware that this is a toy, not intended to be an RFC for _hyperfine_ inclusion. I don't think this feature belongs in _hyperfine_, at least quite in this way, for a few reasons:

- Low impact: Benchmarking tends to be either really quick (a few seconds) or really long (several hours). For the former, post-processing reported data is sufficient to get quick feedback, and for the latter, I really hope nobody sits staring at the terminal for individual data points to pop in.
- Implementation complexity: My hack added several complications to the tool implementation that are really not worth the value. At least some of this complexity will be hard to avoid in a real implementation.

Let's take a quick look at the challenges / fun stuff I got to tackle:

- I built the TUI using [_ratatui_]. In applications built with _ratatui_, one thread must be chosen as the thread that updates the user interface on each rendering pass. This UI thread must not be blocked for any slow operations so as to avoid janky screen updates (this is a very common requirement for all UI frameworks). Since _hyperfine_ does not have a UI to speak of, it keeps things simple (yay!) by staying single-threaded. The commands being benchmarked are launched in their own process, but _hyperfine_ process has a single thread. To add a UI layer, I had to use a background thread for _hyperfine_'s heavy-lifting to free up the UI thread.
- Related to the minimal UI design of _hyperfine_, it currently uses the [_console_] and [_indicatif_] crates to update the terminal. These crates' interactions with the terminal don't play very well with _ratatui_'s. So I had to write some bridging code to continue to render hyperfine's standard output to a _ratatui_ block in the UI. This glue code works, but is definitely FHL quality 😉
    - Also, _hyperfine_ currently directly writes to the console, both via `print!`-style macros and via the crates above. I had to add a layer of indirection to be able to redirect that output to the appropriate part of the UI.

For a look under the hood, see this [abanandoned pull request](https://github.com/callpraths/hyperfine/pull/1).

A note on the use of LLMs: I used Google's Antigravity IDE with the Gemini suite of models to aid in this hack. First, I used it to summarize the architecture of the repo so I could onboard quickly. I _did not_ use LLMs when setting up the basic approach: process management & first-pass implementation. I then relied heavily on LLMs for refactoring and addition of small features, mostly vibe-coding these small additions. I find this method of leveraging LLMs to be very effective - it makes sure that I'm in the driving seat and learning a lot while also providing a multiplier on the execution velocity.

Well, that was fun! A natural next step here for me is to find ways to truly contribute back to _hyperfine_ now that I'm comfortable with its inner workings ☺️

[tui]: https://en.wikipedia.org/wiki/Text-based_user_interface
[geo-geos-perf-study]: https://callpraths.github.io/geoscience/2022/02/27/geo-geos-perf.html
[_hyperfine_]: https://lib.rs/crates/hyperfine
[hyperfine-interleaving-issue]: https://github.com/sharkdp/hyperfine/issues/21
[_ratatui_]: https://ratatui.rs/
[_console_]: https://lib.rs/crates/console
[_indicatif_]: https://lib.rs/crates/indicatif