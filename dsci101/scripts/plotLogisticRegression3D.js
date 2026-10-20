function generateData(totalPoints) {
    // Generate data for the plot
    const rand = d3.randomLcg(42);
    const data = [];

    const randMinus = d3.randomNormal.source(rand)(-2, 1);
    const randPlus = d3.randomNormal.source(rand)(0.5, 1);

    for (let i = 0; i < totalPoints; i++) {
        if (i < totalPoints / 2) {
            const x1 = randMinus();
            const x2 = randMinus();
            data.push({x1: x1, x2: x2, y: 0}); 
        } else {
            const x1 = randPlus();
            const x2 = randPlus();
            data.push({x1: x1, x2: x2, y: 100}); 
        }
    }
    return data; 
}

function getAccuracy(predictY, initialData) {
    // Function that calculates accuracy and assigns color and markers to the data based on it
    let correctCount = 0;
    const data = initialData.map(d => ({...d})); 

    data.forEach(d => {
        const pred_prob = predictY(d.x1, d.x2); 
        d.y_pred = (pred_prob / 10) - 5; 

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
    
    const accuracy = (correctCount / data.length) * 100;
    return { data: data, accuracy: accuracy }
}

// Variables to ensure that scene is only generated once
let isSceneInitialized = false;
let scene; 
let initialData;

function plotLogisticRegression3D() {
    // Colors used in plot
    let color_data = "#3070B7";
    let color_grid = "#d9c7d7";
    let color_estimate = "#377e22";

    // Font
    let font = 'Arial';

    removePlot("#myplot1");
    
    // Set the dimensions and margins of the graph
    var margin = {top: 60, right: 220, bottom: 80, left: 100},
                width = 800 - margin.left - margin.right,
                height = 450 - margin.top - margin.bottom;
                
    // Append the svg object to the body of the page
    var svg = appendSvg("#myplot1", width, height, margin);

    // Contains the code that only needs to be generated once.
    function renderPlot() {
        if (!isSceneInitialized) {
            scene = d3.select("#myplot2 scene");
            
            const scene_size = 10;
            const num_grid_lines = 21;
            const color_grid = "#E0E0E0";
            
            // Generate the data.
            initialData = generateData(50);
            
            drawGrid(scene, scene_size, num_grid_lines, color_grid);

            // Draw the axes
            const axisLength = scene_size / 2;
            drawAxis(scene, 'black', 'x1', [-axisLength, 0, 0], [axisLength, 0, 0], [axisLength + 0.8, 0, 0]);
            drawAxis(scene, 'black', 'x2', [0, 0, -axisLength], [0, 0, axisLength], [0, 0, axisLength + 0.8]);
            drawAxis(scene, 'black', 'y', [0, -axisLength, 0], [0, axisLength, 0], [0, axisLength + 0.8, 0]);

            // Draw the 3D title
            addTitle(`Surface Plot showing f(x)`, '#myplot2');

            // Get the initial slider values
            let c2_init = parseFloat(document.getElementById('c2Box').value) || 0;
            let c1_init = parseFloat(document.getElementById('c1Box').value) || 0;
            let b_init = parseFloat(document.getElementById('bBox').value) || 0;
            const predictY_init = (x1, x2) => 100 / (1 + Math.exp(-(c2_init * x2 + c1_init * x1 + b_init)));
            
            let { data, _ } = getAccuracy(predictY_init, initialData);
            
            drawPoints(scene, data, true); 

            isSceneInitialized = true;
        }
    }

    renderPlot();

    // Get c2, c1, and b from variables drawn from text fields
    let c2 = parseFloat(document.getElementById('c2Box').value) || 0;
    let c1 = parseFloat(document.getElementById('c1Box').value) || 0;
    let b = parseFloat(document.getElementById('bBox').value) || 0;

    // Set the function.
    const predictY = (x1, x2) => 100 / (1 + Math.exp(-(c2 * x2 + c1 * x1 + b)));

    drawPlane(scene, c2, c1, b, 10, color_estimate, true);
    drawDecisionBoundary3D(scene, c2, c1, b, 10, 'red');

    let { data, accuracy } = getAccuracy(predictY, initialData);

    // Redraw the points according to their new shapes.
    scene.selectAll(".data-points").remove();
    drawPoints(scene, data, true);
    
    // Min and max x and y
    let xmin = -5, xmax = 5

    // Add x axis
    let x1 = addXAxis(svg, xmin, xmax, width, height);

    // Add y axis
    let x2 = addYAxis(svg, xmin, xmax, width, height);

    // Grid lines
    drawGridlines(7, 9, width, height, color_grid);

    // Draw decision boundary line
    if (c2 != 0) {
        drawDecisionBoundary2D(svg, x1, x2, c1, c2, b, 'red');
    }

    // Add 2D dots
    addDots(svg, data, x1, x2, color_data, true);
    
    // Redraw 2D title
    addTitle(`Doing Logistic Regression Manually: accuracy = ${accuracy.toFixed(1)}%`, '#myplot1');

    // y label
    addYLabel(svg, font, height, -margin.left / 2, "x2");

    // x label
    addXLabel(svg, font, width, height, margin, "x1");

    d3.select("#legend").remove();

    // Legend entries
    addLegendEntry('#myplot1', "y=1; pred=1", "circle", 'orange', 200, -200);
    addLegendEntry('#myplot1', "y=1; pred=0", "square", 'orange', 200, -200);
    addLegendEntry('#myplot1', "y=0; pred=0", "square", 'blue', 200, -200);
    addLegendEntry('#myplot1', "y=0; pred=1", "circle", 'blue', 200, -200);

    // Find the solution to the regression
    function solveRegression() {
        document.getElementById('bSlider').value = 0.3;
        document.getElementById('bBox').value = 0.3;
        document.getElementById('c1Slider').value = 1.7;
        document.getElementById('c1Box').value = 1.7;
        document.getElementById('c2Slider').value = 1.7;
        document.getElementById('c2Box').value = 1.7;
    }

    window.solveRegression = solveRegression;
}