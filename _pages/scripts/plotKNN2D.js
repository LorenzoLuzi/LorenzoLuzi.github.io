function generateData(totalPoints) {
    // Generate data for the plot
    const data = [];
    const rand = d3.randomLcg(42);
    const norm = d3.randomNormal.source(rand)(0, 1);
    for (let i = 0; i < totalPoints; i++) {
        const x1 = norm();
        const x2 = norm();
        const y = Math.sin(x1 / 2) + Math.sin(x2 / 2);
        data.push({ x1: x1, x2: x2, y: y });
    }
    return data;
}

// Variables to ensure that scenes are only generated once
let isSceneInitialized = false;
let scene1;
let scene2; 

function plotKNN2D() {
    let color_data = "#3070B7";

    removePlot("#myplot");
    
    // Set the dimensions and margins of the graph
    var margin = {top: 60, right: 220, bottom: 80, left: 100},
                width = 900 - margin.left - margin.right,
                height = 450 - margin.top - margin.bottom;
                
    
    // Contains the code that only needs to be generated once.
    function renderPlot() {
        if (!isSceneInitialized) {
            scene1 = d3.select("#myplot1 scene");
            scene2 = d3.select("#myplot2 scene");
            
            const scene_size = 10;
            const num_grid_lines = 21;
            const color_grid = "#E0E0E0";
            
            const axisLength = scene_size / 2;

            // Draw the grid for scene 2
            drawGrid(scene1, scene_size, num_grid_lines, color_grid);
            
            // Draw the axes for scene 1
            drawAxis(scene1, 'black', 'x1', [-axisLength, 0, 0], [axisLength, 0, 0], [axisLength + 0.8, 0, 0]);
            drawAxis(scene1, 'black', 'x2', [0, 0, -axisLength], [0, 0, axisLength], [0, 0, axisLength + 0.8]);
            drawAxis(scene1, 'black', 'y', [0, -axisLength, 0], [0, axisLength, 0], [0, axisLength + 0.8, 0]);

            // Draw the grid for scene 2
            drawGrid(scene2, scene_size, num_grid_lines, color_grid);

            // Draw the axes for scene 2
            drawAxis(scene2, 'black', 'x1', [-axisLength, 0, 0], [axisLength, 0, 0], [axisLength + 0.8, 0, 0]);
            drawAxis(scene2, 'black', 'x2', [0, 0, -axisLength], [0, 0, axisLength], [0, 0, axisLength + 0.8]);
            drawAxis(scene2, 'black', 'y', [0, -axisLength, 0], [0, axisLength, 0], [0, axisLength + 0.8, 0]);

            // Draw the plane in the second plot
            drawPlane(scene2, 0, 0, 0, 10, '#377e22', false, true);

            drawColorBar('1', -2, 2, 200, 600, "Learned f");
            drawColorBar('2', -2, 2, 200, 1200, "Ground Truth");

            // Add legend entry
            addLegendEntry('#myplot1', "Data", "circle", color_data, 100, -100);

            isSceneInitialized = true;
        }
    }

    renderPlot();

    // Get k and n from variables drawn from text fields
    let k = parseFloat(document.getElementById('kBox').value) || 0;
    let n = parseFloat(document.getElementById('nBox').value) || 0;

    // Get the data
    data = generateData(n);

    // Add the titles
    addTitle(`2-D K-nearest neighbors regression with n = ${n}, k = ${k}`, '#myplot1');
    addTitle(`Ground truth function`, '#myplot2');

    // Draw points on the first plot
    drawPoints(scene1, data); 

    // Draw the KNN plane connecting the points
    drawKnnPlane(scene1, data, k, -3, 3);
}
