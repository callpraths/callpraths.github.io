---
layout: post
title:  "Chapter 2: The test that would only pass two times out of five"
date:   2022-11-02 00:00:00 +0000
style: ci-reliability
---

This post is part of a [blog series] on my exploits measuring and squashing reliability woes in the Continuous Integration (CI) actions of the [Azure Communication Services](https://learn.microsoft.com/en-us/azure/communication-services/overview) [web UI library](https://azure.github.io/communication-ui-library/?path=/story/overview--page).

Soon after I started tracking my synthetic metric for test flakiness, the metric jumped to nearly 100% - most CI jobs were failing only because of test flakiness.

{:refdef: style="text-align: center;"}
![](/assets/article_images/ci-reliability/ch2-ci-health-metric.png)
{: refdef}

<p class="img-caption">
    Probability of a pre-submit CI job failing due to test flakiness (lower is better). The probability of failure shot up to 100% on Jul 21 and stayed there for a week.
</p>

A CI workflow that often fails for reasons unrelated to the software under test is far worse than no CI at all. It costs the developers effort to understand the failures on their Pull Requests, delays merging of Pull Request due to unrelated failures that need to be manually retried, and provides no benefit when it eventually succeeds because of a loss of confidence in the CI. A CI workflow that fails every time because of flakiness is essentially a day off for the engineering team.

Earlier, I had struggled to find opportunities for large improvements in CI job runtime – there were no obvious tests whose runtime could be improved by a large fraction and that would lead to a corresponding improvement in the job runtime. Not so with flakiness – almost all the sudden jump in test flakiness was caused by a single test:

{:refdef: style="text-align: center;"}
![](/assets/article_images/ci-reliability/ch2-test-flakiness.png)
{: refdef}

<p class="img-caption">
    Weekly success rate of tests in post-submit CI (higher is better). The sudden decrease in stability of a readReceipt test is clearly visible.
</p>

The success rate of a particular readReceipt test dropped from about 90% to 40%, and stayed at exactly 40% for a week. There is always some variance in metrics on a real-world process, and the fact that the success rate stayed stubbornly constant made me immediately suspect that there was a flaw in my data collection or processing steps. Some exploratory data analysis of the success rate of the affected test uncovered an obvious reason (in hindsight) for the 40%:

{:refdef: style="text-align: center;"}
![](/assets/article_images/ci-reliability/ch2-test-failure-drilldown.png)
{: refdef}

<p class="img-caption">
    Weekly success rate of tests in post-submit CI (higher is better). The sudden decrease in stability of a readReceipt test is clearly visible.
</p>

Each test in our CI is run on three browsers – Desktop Chrome, and Android browser in landscape and portrait views. For each browser, the test is retried twice on failure (i.e., maximum three attempts per browser). It so happened that the test was failing on Desktop Chrome a 100% of the time. Thus, each CI job successfully ran the test once each on Android landscape and portrait views, and then three times unsuccessfully on Desktop Chrome. Hence the stubborn 40% success rate. This was welcome news, a test that fails a 100% of the time is a lot easier to deal with than one that fails on some of the time.

I debugged an arbitrary recent test failure and found that the problem was in an image comparison between a UI screenshot and the golden file.

{:refdef: style="text-align: center;"}
![](/assets/article_images/ci-reliability/ch2-test-failure-screenshot.png)
{: refdef}

A tooltip in the UI screenshot was a few pixels off as compared to the golden file. I was never able to reproduce the bug on my workstation – my local test run would always generate the same UI screenshot as the golden file and the test would succeed. I hypothesized that this bug was related to the fact that CI jobs run on virtual machines which tend to be slower than my development workstation. In the test, the text in the tooltip was modified programmatically and then a UI screenshot was captured. I guessed that the tooltip was auto-resizing to re-center the text, but the resizing wasn’t fast enough on the CI machines – the UI screenshot was captured before the tooltip could resize (with the text off-center). By fluke, the golden files had been updated to the post-resize screenshots by a separate CI job. Following that CI job, all CI jobs started failing the screenshot comparison. With some code archeology, I was able to find the [Pull Request that had updated the golden files to the highly unlikely screenshot](https://github.com/Azure/communication-ui-library/pull/2109/files#diff-4a7b54986c485ffa66e02be6f72af94bf5dcfe2fe0e2823256cd8a1f950edcbd). That Pull Request was entirely unrelated to the test that started failing, but it had converted a flaky test that failed very infrequently to one that failed all the time. I [merged a speculative fix](https://github.com/Azure/communication-ui-library/pull/2122) based on this informed guess of the root cause of the issue.

Once I realized that this was a consistent failure on a single browser, it took me less than a day to root cause the failure and find a fix. The funny part is that it then took me several days to prove that my fix had, in fact, worked.

## Some of my data is gone, and I don’t know which!

Having merged my speculative fix, I expected the success rate of the affected to start rising (slowly, because of the 7 day rolling aggregation window). Or, if my fix had failed, I expected the success rate to stay unchanged.

Neither happened:

{:refdef: style="text-align: center;"}
![](/assets/article_images/ci-reliability/ch2-test-flakiness-missing-data.png)
{: refdef}

<p class="img-caption">
    Weekly success rate of tests in post-submit CI (higher is better).  My fix was merged July 27. Data stopped being reported for affected test July 28.
</p>

The graph for the success rate of the affected test simply disappeared a day after I merged my fix. It took a combination of sleuthing and luck to figure out what was happening. tl;dr – CI was reporting test statistics only partially for 18 days before I noticed it because of my work on this flaky test. There were multiple twists in this fortnight of incomplete data:

<table class="ci-generic" style="width: 80%">
    <tr>
        <th>July 14</th>
        <td>I merged a <a href="https://github.com/Azure/communication-ui-library/pull/2064">Pull Request</a> that started invoking Playwright twice instead of once. The second invocation started overwriting the test statistics generated from the first one. Thus, test statistics from the first invocation were lost.</td>
    </tr>
    <tr>
        <th>July 15</th>
        <td>I merged a <a href="https://github.com/Azure/communication-ui-library/pull/2072">Pull Request</a> so that hermetic tests, including the readReceipt test, were run in the first invocation and live tests were run in the second invocation. Thus, the test statistics for the readReceipt test would be overwritten by the those for live tests. Incidentally, this Pull Request also changed the behavior so that the second invocation only happened if the first invocation was completed successfully. Because the readReceipt test was failing 100% of the time on Desktop Chrome, the live tests were never run and the test statistics for the readReceipt test were reported.</td>
    </tr>
    <tr>
        <th>July 27</th>
        <td>My <a href="https://github.com/Azure/communication-ui-library/pull/2122">speculative Pull Request</a> fixed the readReceipt test. As a result, the first invocation of Playwright started completing successfully. The live tests started to run in the second invocation and overwrote all tests statistics for the first invocation. I stopped seeing any data for the now fixed readReceipt test!</td>
    </tr>
    <tr>
        <th>Aug 3</th>
        <td>I figured all this out and <a href="https://github.com/Azure/communication-ui-library/pull/2145">fixed the CI job</a> to avoid overwriting test statistics from the first Playwright invocation.</td>
    </tr>
</table>

Once I fixed the data reporting bug, I could finally confirm that my fix had worked – perfectly:

{:refdef: style="text-align: center;"}
![](/assets/article_images/ci-reliability/ch2-test-failure-drilldown-recovery.png)
{: refdef}

<p class="img-caption">
    Success rate of a readReceipt test, split by target browser (higher is better). The graph for Desktop Chrome satisfyingly jumped back to 100% after some data quality ninja work.
</p>

As a follow up to my data quality ninja work above, I added a supplementary graph tracking the number of unique tests that are run each day. This graph clearly showed the data loss on July 25 and July 27 (exactly how many tests were reported on this graph depended on what tests were succeeding in CI) and the recovery on Aug 3.

{:refdef: style="text-align: center;"}
![](/assets/article_images/ci-reliability/ch2-unique-test-count.png)
{: refdef}

<p class="img-caption">
    Unique tests run each day. The number is expected to stay mostly constant, changing slowly as new tests are added or old tests are retired.
</p>

There is a moral here for your next data-driven engineering effort – work on data quality should be an essential and ongoing part of such a project. You should treat inferences from data analysis as provisional until validated by independent data, sampling, or actual system behavior. Also remember that contextual  data analysis is often key to a high-quality data analysis pipeline even though it almost universally goes unmentioned.