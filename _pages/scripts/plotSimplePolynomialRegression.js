function generateData(xmax, xmin, totalPoints) {
    // Generate data for the plot
    const data = [];
    const rand = d3.randomLcg(42);
    for (let i = 0; i < totalPoints; i++) {
        const x = rand() * (xmax - xmin) + xmin;
        const y = (x - 2.08) ** 2 - rand();
        data.push({ x: x, y: y });
    }
    return data;
}

function plotSimplePolynomialRegression() {
    // Colors used in plot
    let color_data = "#3070B7";
    let color_estimate = "#377e22";
    let color_residuals = "red";
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
    const data = generateData(0, 6, 100);

    // Get c2, c1, and b from variables drawn from text fields
    let c2 = parseFloat(document.getElementById('c2Box').value) || 0;
    let c1 = parseFloat(document.getElementById('c1Box').value) || 0;
    let b = parseFloat(document.getElementById('bBox').value) || 0;

    // Set the function.
    const predictPolynomial = x => c2 * (x ** 2) + c1 * x + b;

    // Min and max x and y
    let { xmin, xmax, ymin, ymax } = getMinMax(data, predictPolynomial);

    // Add x axis
    let x = addXAxis(svg, xmin, xmax, width, height);

    // Add y axis
    let y = addYAxis(svg, ymin, ymax, width, height);

    // Grid lines
    // Line strokes: https://observablehq.com/@onoratod/animate-a-path-in-d3
    drawGridlines(7, 9, width, height, color_grid);

    // Draw Residuals
    drawResiduals(svg, data, color_residuals, x, y, predictPolynomial);

    // Draw line for estimate
    drawEstimateLine(svg, x, y, xmin, xmax, predictPolynomial, color_estimate);

    // Add dots
    addDots(svg, data, x, y, color_data);
    
    // Calculate error
    let error = calcError(data, predictPolynomial);

    // Title
    addTitle(`Simple Polynomial Regression: c\u2082 = ${c2.toFixed(2)}, c\u2081 = ${c1.toFixed(2)}, b = ${b.toFixed(2)}, total error = ${error.toFixed(2)}`, '#myplot', '0px');

    // y label
    addYLabel(svg, font, height, -margin.left/2, "Y values");

    // x label
    addXLabel(svg, font, width, height, margin, "X values");

    d3.select("#legend").remove();

    // Data entry
    addLegendEntry('#myplot', "Data", "circle", color_data, 150, -400);

    // Residuals entry
    addLegendEntry('#myplot', "Residuals", "line", color_residuals, 150, -400);

    // Estimate entry
    addLegendEntry('#myplot', "Estimate c\u2082x\u00B2 + c\u2081x + b", "line", color_estimate, 150, -400);

    // Find the solution to the regression
    function solveRegression() {
        // Extract X and y matrices
        const X = data.map(d => [1, d.x, d.x ** 2]);
        const y = data.map(d => d.y);

        // Matrix multiplication
        const X_t = math.transpose(X);
        const X_tX = math.multiply(X_t, X);
        const coefs = math.multiply(math.inv(X_tX), math.multiply(X_t, y));

        // Extract coefficients and assign them to the box and sliders
        const b = +coefs[0].toFixed(4);
        const c1 = +coefs[1].toFixed(4);
        const c2 = +coefs[2].toFixed(4);

        document.getElementById('bBox').value = b;
        document.getElementById('bSlider').value = b;
        document.getElementById('c1Box').value = c1;
        document.getElementById('c1Slider').value = c1;
        document.getElementById('c2Box').value = c2;
        document.getElementById('c2Slider').value = c2;
    }

    window.solveRegression = solveRegression;
}
