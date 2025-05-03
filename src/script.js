const FILE = 'data/chocolate_sales.csv';
const DATE_FMT = d3.timeParse('%d-%b-%y');
const MONTH_FMT = d3.timeFormat('%Y-%m');
const areaSvg    = d3.select('#area-chart');
const ctxSvg     = d3.select('#context-chart');
const barSvg     = d3.select('#bar-chart');
const tableHead  = d3.select('#data-table thead');
const tableBody  = d3.select('#data-table tbody');
const pagDiv     = d3.select('#pagination');
const areaColor = '#b2f7ef';
const ctxColor  = '#b2f7ef';
const catColor  = d3.scaleOrdinal()
    .range(['#ffb74d', '#f06292', '#ba68c8', '#4fc3f7', '#81c784', '#ffd54f', '#00bfae', '#7e57c2']);

d3.csv(FILE, d => ({
    ...d,
    Amount: +d.Amount.replace(/[$,]/g, ''),
    Date  : DATE_FMT(d.Date)
})).then(data => {
    rawData = data;
    const monthlyMap = d3.rollup(
        rawData,
        v => d3.sum(v, d => d.Amount),
        d => MONTH_FMT(d.Date)
    );
    monthlyAgg = Array.from(monthlyMap, ([key, total]) => ({
        month: d3.timeParse('%Y-%m')(key),
        total
    })).sort((a, b) => d3.ascending(a.month, b.month));
    computeCategoryAgg();
    buildAreaChart();
    buildBarChart();
    buildDataTable();
    d3.select('#reset-btn').on('click', () => {
        appState.reset();
    });
});

function computeCategoryAgg(filterData = rawData) {
    const map = d3.rollup(
        filterData,
        v => d3.sum(v, d => d.Amount),
        d => d.Product
    );
    categoryAgg = Array.from(map, ([product, total]) => ({ product, total }));
}

function buildAreaChart() {
    const margin = { top: 10, right: 15, bottom: 60, left: 45 };
    const ctxMargin = { top: 4, right: 15, bottom: 20, left: 45 };
    const width  = areaSvg.node().clientWidth  - margin.left - margin.right;
    const height = areaSvg.node().clientHeight - margin.top  - margin.bottom;
    const ctxH   = ctxSvg .node().clientHeight - ctxMargin.top - ctxMargin.bottom;
    const x = d3.scaleTime()
        .domain(d3.extent(monthlyAgg, d => d.month))
        .range([0, width]);
    const y = d3.scaleLinear()
        .domain([0, d3.max(monthlyAgg, d => d.total)]).nice()
        .range([height, 0]);
    const defs = areaSvg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "area-gradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#43cea2");
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#185a9d");
    const areaGen = d3.area()
        .x(d => x(d.month))
        .y0(height)
        .y1(d => y(d.total))
        .curve(d3.curveStep);
    const g = areaSvg
        .attr('viewBox', [0, 0, width + margin.left + margin.right,
            height + margin.top + margin.bottom])
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    g.append('path')
        .datum(monthlyAgg)
        .attr('fill', areaColor)
        .attr('d', areaGen);
    g.append('g')
        .attr('class', 'x‑axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0));
    g.append('g')
        .attr('class', 'y‑axis')
        .call(d3.axisLeft(y).ticks(6, 's'));
    const ctxX = x.copy();
    const ctxY = d3.scaleLinear()
        .domain(y.domain())
        .range([ctxH, 0]);
    const ctxArea = d3.area()
        .x(d => ctxX(d.month))
        .y0(ctxH)
        .y1(d => ctxY(d.total));
    const ctxG = ctxSvg
        .attr('viewBox', [0, 0, width + ctxMargin.left + ctxMargin.right,
            ctxH + ctxMargin.top + ctxMargin.bottom])
        .append('g')
        .attr('transform', `translate(${ctxMargin.left},${ctxMargin.top})`);
    ctxG.append('path')
        .datum(monthlyAgg)
        .attr('fill', ctxColor)
        .attr('d', ctxArea);
    ctxG.append('g')
        .attr('class', 'x‑axis')
        .attr('transform', `translate(0,${ctxH})`)
        .call(d3.axisBottom(ctxX).ticks(width < 500 ? 4 : 8));
    const brush = d3.brushX()
        .extent([[0, 0], [width, ctxH]])
        .on('end', handleBrush);
    ctxG.append('g')
        .attr('class', 'brush')
        .call(brush);
    function zoom(newXDomain) {
        x.domain(newXDomain);
        g.select('path').transition().duration(600).attr('d', areaGen);
        g.select('.x‑axis').transition().duration(600).call(d3.axisBottom(x).tickSizeOuter(0));
    }
    function handleBrush({ selection }) {
        if (!selection) return;
        const [x0, x1] = selection.map(ctxX.invert);
        appState.updateTimeRange([x0, x1]);
        zoom([x0, x1]);
    }
    buildAreaChart.zoom = zoom;
}

function buildBarChart() {
    const margin = { top: 10, right: 15, bottom: 50, left: 60 };
    const width  = barSvg.node().clientWidth  - margin.left - margin.right;
    const height = barSvg.node().clientHeight - margin.top  - margin.bottom;
    const x = d3.scaleBand()
        .domain(categoryAgg.map(d => d.product))
        .range([0, width])
        .padding(0.2);
    const y = d3.scaleLinear()
        .domain([0, d3.max(categoryAgg, d => d.total)]).nice()
        .range([height, 0]);
    const g = barSvg
        .attr('viewBox', [0, 0, width + margin.left + margin.right,
            height + margin.top + margin.bottom])
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    g.selectAll('.bar')
        .data(categoryAgg)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.product))
        .attr('y', d => y(d.total))
        .attr('width', x.bandwidth())
        .attr('height', d => y(0) - y(d.total))
        .attr('fill', d => catColor(d.product))
        .on('click', (event, d) => {
            appState.updateSelectedProduct(
                appState.selectedProduct === d.product ? null : d.product
            );
        });
    const xAxis = g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-35)')
        .style('text-anchor', 'end');
    g.append('g')
        .call(d3.axisLeft(y).ticks(6, 's'));
    buildBarChart.x = x;
    buildBarChart.y = y;
    buildBarChart.g = g;
}

function buildDataTable() {
    const columns = [
        { label: 'Sales Person',  key: 'Sales Person' },
        { label: 'Country',       key: 'Country' },
        { label: 'Product',       key: 'Product' },
        { label: 'Date',          key: 'Date',  fmt: d3.timeFormat('%d‑%b‑%y') },
        { label: 'Amount',        key: 'Amount', fmt: d3.format('$,.2f') },
        { label: 'Boxes Shipped', key: 'Boxes Shipped' }
    ];
    const sortState = {};
    const headerRow  = tableHead.append('tr');
    const filterRow  = tableHead.append('tr');
    columns.forEach(col => {
        headerRow.append('th')
            .text(col.label)
            .on('click', () => {
                const current = sortState.key === col.key && sortState.asc;
                sortState.key = col.key;
                sortState.asc = !current;
                renderTable();
            });
        filterRow.append('th')
            .append('input')
            .attr('type', 'text')
            .attr('placeholder', 'filter…')
            .on('input', renderTable);
    });
    function renderTable(resetPage = true) {
        let filtered = rawData
            .filter(d => appState.timeRange === null ||
                (d.Date >= appState.timeRange[0] && d.Date <= appState.timeRange[1]))
            .filter(d => appState.selectedProduct === null ||
                d.Product === appState.selectedProduct);
        filterRow.selectAll('input').each(function(_, i) {
            const val = this.value.trim().toLowerCase();
            if (val) {
                const key = columns[i].key;
                filtered = filtered.filter(row => String(row[key]).toLowerCase().includes(val));
            }
        });
        if (sortState.key) {
            const k = sortState.key;
            filtered.sort((a, b) =>
                sortState.asc ? d3.ascending(a[k], b[k]) : d3.descending(a[k], b[k])
            );
        }
        const pageData = filtered;
        const rows = tableBody.selectAll('tr')
            .data(pageData, d => d.id || JSON.stringify(d));
        rows.exit().remove();
        const enter = rows.enter().append('tr')
            .on('click', function(event, d) {
                const idx = appState.selectedRows.indexOf(d);
                if (idx > -1) {
                    appState.selectedRows.splice(idx, 1);
                } else {
                    appState.selectedRows.push(d);
                }
                appState.notifyVisualizations();
            });
        enter.merge(rows).html('')
            .classed('selected', d => appState.selectedRows.includes(d))
            .each(function(row) {
                const tr = d3.select(this);
                columns.forEach(col => {
                    tr.append('td')
                        .text(col.fmt ? col.fmt(row[col.key]) : row[col.key]);
                });
            });
        pagDiv.html('');
    }
    buildDataTable.render = renderTable;
    renderTable();
}

function updateBarChart(state) {
    const filtered = rawData.filter(d =>
        (state.timeRange === null ||
            (d.Date >= state.timeRange[0] && d.Date <= state.timeRange[1])));
    computeCategoryAgg(filtered);
    const g = buildBarChart.g;
    const x = buildBarChart.x
        .domain(categoryAgg.map(d => d.product))
        .padding(0.2);
    const y = buildBarChart.y
        .domain([0, d3.max(categoryAgg, d => d.total)]).nice();
    const bars = g.selectAll('.bar').data(categoryAgg, d => d.product);
    bars.exit().transition().duration(400)
        .attr('height', 0)
        .attr('y', y(0))
        .remove();
    bars.enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.product))
        .attr('width', x.bandwidth())
        .attr('y', y(0))
        .attr('height', 0)
        .attr('fill', d => catColor(d.product))
        .on('click', (event, d) => {
            state.updateSelectedProduct(
                state.selectedProduct === d.product ? null : d.product
            );
        })
        .merge(bars)
        .transition().duration(600)
        .attr('x', d => x(d.product))
        .attr('width', x.bandwidth())
        .attr('y', d => y(d.total))
        .attr('height', d => y(0) - y(d.total))
        .attr('opacity', d =>
            state.selectedProduct && state.selectedProduct !== d.product ? 0.35 : 1);
    g.select('.y‑axis').transition().duration(600).call(d3.axisLeft(y).ticks(6, 's'));
    g.select('.x‑axis')
        .transition().duration(600)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-35)')
        .style('text-anchor', 'end');
}

function updateDataTable(state) {
    buildDataTable.render();
}

function updateAreaChart(state) {
    if (state.timeRange === null) {
        const full = d3.extent(monthlyAgg, d => d.month);
        buildAreaChart.zoom(full);
    }
}

const appState = {
    timeRange:       null,
    selectedProduct: null,
    selectedRows:    [],
    updateTimeRange(range) {
        this.timeRange = range;
        this.notifyVisualizations();
    },
    updateSelectedProduct(prod) {
        this.selectedProduct = prod;
        this.notifyVisualizations();
    },
    updateSelectedRows(rows) {
        this.selectedRows = rows;
        this.notifyVisualizations();
    },
    reset() {
        this.timeRange       = null;
        this.selectedProduct = null;
        this.selectedRows    = [];
        this.notifyVisualizations();
    },
    notifyVisualizations() {
        updateAreaChart(this);
        updateBarChart(this);
        updateDataTable(this);
    }
};
