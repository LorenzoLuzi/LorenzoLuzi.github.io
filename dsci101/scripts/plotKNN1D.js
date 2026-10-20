function generateData(xmax, xmin, totalPoints) {
    // Generate data for the plot
    const data = [];
    const rand = d3.randomLcg(42);
    const norm = d3.randomNormal.source(rand)(0, 1);
    for (let i = 0; i < totalPoints; i++) {
        const x = (norm() / 6 + 0.5) * (xmax - xmin) + xmin;
        const y = Math.sin(x) + norm() * 0.2;
        data.push({ x, y });
    }
    return data;
}

function plotKNN1D() {
    // Colors used in plot
    let color_data = "#3070B7";
    let color_grid = "#d9c7d7";

    // Font
    let font = 'Arial';

    removePlot("#myplot");
    
    // Set the dimensions and margins of the graph
    var margin = {top: 60, right: 220, bottom: 80, left: 100},
                width = 900 - margin.left - margin.right,
                height = 450 - margin.top - margin.bottom;
                
    
    // Append the svg object to the body of the page
    var svg = appendSvg("#myplot", width, height, margin);
            
    // Get the data
    let data = generateData(0, 2 * Math.PI, 1000);

    // Get k and n from variables drawn from text fields
    let k = parseFloat(document.getElementById('kBox').value) || 0;
    let n = parseFloat(document.getElementById('nBox').value) || 0;

    // Min and max x and y
    let xmin = -0.1 * (2 * Math.PI);
    let xmax =  1.1 * (2 * Math.PI);
    let ymin = -1.5;
    let ymax = 1.5;

    // Add x axis
    let x = addXAxis(svg, xmin, xmax, width, height);       

    // Add y axis
    let y = addYAxis(svg, ymin, ymax, width, height);

    // Grid lines
    // Line strokes: https://observablehq.com/@onoratod/animate-a-path-in-d3
    drawGridlines(7, 9, width, height, color_grid);

    // Add dots
    data = data.slice(0, n);
    addDots(svg, data, x, y, color_data);

    // Draw curve
    drawKnnCurve(svg, data, k, x, y, xmin, xmax);

    // Title
    addTitle(`1-D K-nearest neighbors regression with n = ${n}, k = ${k}`, '#myplot', '0px');

    // y label
    addYLabel(svg, font, height, -margin.left/2, "Y values");

    // x label
    addXLabel(svg, font, width, height, margin, "X values");

    d3.select("#legend").remove();

    // Data entry
    addLegendEntry('#myplot', "Data", "circle", color_data, 150, -400);

    // Learned entry
    addLegendEntry('#myplot', "Learned f", "line", "orange", 150, -400);

}
