import * as chartJs from "https://cdn.jsdelivr.net/npm/chart.js@4.2.1/+esm";

chartJs.Chart.register(...chartJs.registerables);

function renderPerfGraph(targetId, sourceIds) {
    const target = document.getElementById(targetId);

    const palette = [
        "rgb(33, 87, 36)",
        "rgb(223, 187, 55)",
        "rgb(221, 150, 70)",
        "rgb(204, 73, 71)",
        "rgb(70, 179, 103)",
    ];

    const chart = new chartJs.Chart(target, {
        type: "scatter",
        data: { datasets: [] },
        options: {
            elements: {
                point: {
                    borderWidth: 4,
                },
            },
            scales: {
                x: {
                    type: "linear",
                    min: 0,
                    max: 10.5,
                    ticks: {
                        stepSize: 1,
                        includeBounds: false,
                    },
                },
                y: {
                    type: "linear",
                    min: 0,
                    max: 2500,
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    position: "top",
                },
                title: {
                    display: true,
                    text: "Various perf measurements",
                },
            },
        },
    });

    sourceIds.forEach((sourceId) => {
        const source = document.getElementById(sourceId);
        source.addEventListener("report-perf-measurement", (ev) => {
            const { name: label, duration } = ev.detail;
            console.log(`Received perf measurement for ${label} - ${duration}`);
            // We are demonstrating UI thread freezes in some of the examples.
            // Always schedule a new task so any animations for graph update don't freeze as well.
            setTimeout(() => {
                const dataset = findOrCreateDataset(chart, label, palette.shift());
                // Shift first so we get the right value for 'x'.
                if (dataset.data.length == 10) {
                    dataset.data.shift();
                    dataset.data.forEach((p) => {
                        p.x = p.x - 1;
                    });
                }
                dataset.data.push({ x: dataset.data.length + 1, y: duration });
                chart.update();
            }, 0);
        });
    });
}

function findOrCreateDataset(chart, label, color) {
    for (const dataset of chart.data.datasets) {
        if (dataset.label === label) {
            return dataset;
        }
    }
    const dataset = { label, data: [], borderColor: color };
    chart.data.datasets.push(dataset);
    return dataset;
}

renderPerfGraph("perf-report-graph", ["xc-awaited-promise", "xc-unawaited-promise", "xc-unawaited-unmeasured-promise", "xc-set-timeout"]);