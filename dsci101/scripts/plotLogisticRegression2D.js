function generateData(totalPoints) {
    // Generate data for the plot
    const rand = d3.randomLcg(42);
    const data = [];

    for (let i = 0; i < totalPoints; i++) {
        if (i < totalPoints / 2) {
            const x = (rand() - 0.5) * 4 - 2;
            data.push({x: x, y: 0}); 
        } else {
            const x = (rand() - 0.5) * 4 + 0.5;
            data.push({x: x, y: 100}); 
        }
    }
    return data; 
}

function getAccuracy(predictY, initialData) {
    // Function that calculates accuracy and assigns color and markers to the data based on it
    let correctCount = 0;
    initialData.forEach(d => {
        const pred_prob = predictY(d.x);
        const pred_class = pred_prob > 50; 
        const true_class = d.y > 50;      

        if (pred_class === true_class) {
            correctCount++;
            d.marker = 'o'; 
        } else {
            d.marker = 'x'; 
        }
        d.color = (true_class) ? 'orange' : 'blue'; 
    });
    
    const accuracy = (correctCount / initialData.length) * 100;
    return { data: initialData, accuracy: accuracy }
}

function plotLogisticRegression2D() {
    // Colors used in plot
    let color_data = "#3070B7";
    let color_grid = "#d9c7d7";
    let color_estimate = "#377e22";

    // Font
    let font = 'Arial';

    removePlot("#myplot");
    
    // Set the dimensions and margins of the graph
    var margin = {top: 60, right: 220, bottom: 80, left: 100},
                width = 900 - margin.left - margin.right,
                height = 450 - margin.top - margin.bottom;
                
    
    // Append the svg object to the body of the page
    var svg = appendSvg("#myplot", width, height, margin);
            
    // Get the data and accuracyx
    let initialData = generateData(50);

    // Get m and b from variables drawn from text fields
    let m = parseFloat(document.getElementById('mBox').value);
    let b = parseFloat(document.getElementById('bBox').value);

    // Set the function.
    const predictY = x => 100 / (1 + Math.exp(-(m * x + b)));

    // Get finalized data and accuracy.
    let { data, accuracy } = getAccuracy(predictY, initialData);

    // Min and max x and y
    let xmin = -5, xmax = 5, ymin = 0, ymax = 100;

    // Add x axis
    let x = addXAxis(svg, xmin, xmax, width, height);

    // Add y axis
    let y = addYAxis(svg, ymin, ymax, width, height);
    addYAxisLabels(svg, 0, 1, width + margin.right / 50, height);

    // Grid lines
    // Line strokes: https://observablehq.com/@onoratod/animate-a-path-in-d3
    drawGridlines(7, 9, width, height, color_grid);

    // Draw line for estimate
    drawEstimateLine(svg, x, y, xmin, xmax, predictY, color_estimate);

    // Draw decision boundary line
    if (m != 0 && (-b / m) >= -5 && (-b / m) <= 5) {
        const decision_boundary = -b / m;
        drawVerticalLine(svg, x, y, decision_boundary, 'red');
    }

    // Add dots
    addDots(svg, data, x, y, color_data);
    
    // Title
    addTitle(`Doing Logistic Regression Manually: accuracy = ${accuracy.toFixed(1)}%`, '#myplot', '0px');

    // y label
    addYLabel(svg, font, height, -margin.left / 2, "Probability that y=1");
    addYLabel(svg, font, height, width + margin.right / 8, "Labels for y");

    // x label
    addXLabel(svg, font, width, height, margin, "X values");

    d3.select("#legend").remove();

    // Legend entries
    addLegendEntry('#myplot', "y=1; pred=1", "circle", 'orange', 150, -400);
    addLegendEntry('#myplot', "y=1; pred=0", "x", 'orange', 150, -400);
    addLegendEntry('#myplot', "y=0; pred=0", "x", 'blue', 150, -400);
    addLegendEntry('#myplot', "y=0; pred=1", "circle", 'blue', 150, -400);

    // Find the solution to the regression
    function solveRegression() {
        document.getElementById('bSlider').value = 0.3;
        document.getElementById('bBox').value = 0.3;
        document.getElementById('mSlider').value = 1.7;
        document.getElementById('mBox').value = 1.7;
    }

    window.solveRegression = solveRegression;
}