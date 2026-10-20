function drawGrid(scene, gridSize, numLines, color) {
    // Define grid and step sizes.
    const gridLines = [];
    const step = gridSize / (numLines - 1);
    const halfGrid = gridSize / 2;

    // Push the actual grid lines in the Z and X directions.
    for (let i = 0; i < numLines; i++) {
        const pos = -halfGrid + i * step;
        gridLines.push([ [pos, 0, -halfGrid], [pos, 0, halfGrid] ]); 
        gridLines.push([ [-halfGrid, 0, pos], [halfGrid, 0, pos] ]); 
    }
    
    // Format the grid lines.
    scene.selectAll("Shape.grid-line")
      .data(gridLines)
      .enter()
      .append("Shape")
      .attr("class", "grid-line")
      .append("Appearance")
      .append("Material")
      .attr("emissiveColor", color);

    scene.selectAll("Shape.grid-line")
      .append("IndexedLineSet")
      .attr("coordIndex", "0 1")
      .append("Coordinate")
      .attr("point", d => `${d[0].join(' ')} ${d[1].join(' ')}`);
}

function drawAxis(scene, color, label, start, end, labelPos) {
    // Format the axis that needs to be labeled.
    const axisGroup = scene.append("Group");
        axisGroup.append("Shape")
            .append("Appearance")
            .append("Material")
            .attr("emissiveColor", color)
            .append("LineProperties")
            .attr("linewidthScaleFactor", 300);
        axisGroup.select("Shape")
            .append("IndexedLineSet")
            .attr("coordIndex", "0 1")
            .append("Coordinate")
            .attr("point", `${start.join(' ')} ${end.join(' ')}`);
        axisGroup.append("Transform")
            .attr("translation", labelPos.join(' '))
            .append("Billboard")
            .append("Shape")
            .append("Appearance")
            .append("Material")
            .attr("diffuseColor", "0 0 0")
            .select(function() { return this.parentNode.parentNode; })
            .append("Text")
            .attr("string", `"${label}"`)
            .append("FontStyle")
            .attr("size", "0.7")
            .attr("family", '"SANS"');
}

function drawPoints(scene, data, logistic=false) {
    const dataGroup = scene.append("Group").attr("class", "data-points");
    // Format the points themselves.    
    const shapes = dataGroup.selectAll("Transform")
        .data(data)
        .enter()
        .append("Transform")
        .attr("translation", d => {
            let toDraw = d.y;
            if (logistic) {
                toDraw = (toDraw / 10) - 5;
            }
            return `${d.x1} ${toDraw} ${d.x2}`;
        })
        .append("Shape")

    
    shapes.append("Appearance")
        .append("Material")
        .attr("diffuseColor", d => d.color || '#3070B7');

    // Change the shape based on the marker
    shapes.each(function(d) {
        const shape = d3.select(this); 
        if (d.marker === undefined || d.marker === 'o') {
            shape.append("Sphere")
                 .attr("radius", "0.15");
        } else if (d.marker === 'x') {
            shape.append("Box")
                 .attr("size", "0.2 0.2 0.2"); 
        }
    });
}

function drawPlane(scene, c2, c1, b, planeSize, color, logistic=false, knn=false) {
    scene.select("Shape.regression-plane").remove();
    const pointsPerSide = knn ? 50 : 20; 
    const vertices = [];
    const faces = [];
    const step = planeSize / (pointsPerSide - 1);
    const colors = [];

    // Build the plane vertices using 20 points per side
    for (let i = 0; i < pointsPerSide; i++) {
        for (let j = 0; j < pointsPerSide; j++) {
            let x_val = -(planeSize / 2) + j * step;
            let z_val = -(planeSize / 2) + i * step;
            let y_val = c1 * x_val + c2 * z_val + b;
            if (knn) {
                y_val = Math.sin(x_val / 2) + Math.sin(z_val / 2);
            }
            if (logistic) {
                y_val = 100 / (1 + Math.exp(-y_val));
                y_val = (y_val / 10) - 5;
            }
            vertices.push(`${x_val} ${y_val} ${z_val}`);
            let t = (y_val + 5) / 10;
            if (knn) {
                t = (y_val + 2) / 4;
            }
            t = Math.max(0, Math.min(1, t));
            const r = t;
            const g = t;
            const bCol = 1 - t;
            colors.push(`${r} ${g} ${bCol}`);
        }
    }

     // Build the plane faces using 20 points per side
    for (let i = 0; i < pointsPerSide - 1; i++) {
        for (let j = 0; j < pointsPerSide - 1; j++) {
            let p1 = i * pointsPerSide + j;
            let p2 = i * pointsPerSide + j + 1;
            let p3 = (i + 1) * pointsPerSide + j + 1;
            let p4 = (i + 1) * pointsPerSide + j;
            faces.push(`${p1} ${p2} ${p3} ${p4} -1`);
        }
    }

    // Format the plane
    const planeShape = scene.append("Shape")
        .attr("class", "regression-plane");

    // Set the plane colors
    planeShape.append("Appearance")
        .append("Material")
        .attr("diffuseColor", color) 
        .attr("transparency", "0.2"); 

    // Add the color gradient
    const faceSet = planeShape.append("IndexedFaceSet")
        .attr("solid", "false")
        .attr("colorPerVertex", "true")
        .attr("coordIndex", faces.join(' '));

    faceSet.append("Coordinate").attr("point", vertices.join(' '));
    faceSet.append("Color").attr("color", colors.join(' '));
}

function drawResiduals(scene, data, c2, c1, b) {
    scene.selectAll("Group.residuals").remove(); 
    
    // Draw the residuals as cylinders to adjust the thickness.
    const residuals = data.map(d => {
        const y_hat = c2 * d.x2 + c1 * d.x1 + b;
        return {
            height: Math.abs(d.y - y_hat),
            midpoint: [d.x1, (d.y + y_hat) / 2, d.x2] 
        };
    });

    // Add the actual cylinders at the appropriate midpoints.
    const residualGroup = scene.append("Group").attr("class", "residuals");
    const residualTransforms = residualGroup.selectAll("Transform")
        .data(residuals)
        .enter()
        .append("Transform")
        .attr("translation", d => d.midpoint.join(' '));

    // Format the residual cylinder.
    const residualShapes = residualTransforms.append("Shape");

    residualShapes.append("Appearance")
        .append("Material")
        .attr("diffuseColor", "red");

    residualShapes.append("Cylinder")
        .attr("height", d => d.height) 
        .attr("radius", "0.02");       
}

function calcError3D(data, predictY) {
    // Calculate the error (predictY is the regression function)
    let error = 0;
    for (let i = 0; i < data.length; i++) {
        error += Math.abs(data[i].y - predictY(data[i].x1, data[i].x2));
    }
    error = error / data.length;
    return error;
}

function drawDecisionBoundary3D(scene, c2, c1, b, sceneSize, color) {
    scene.select(".decision-boundary-group").remove();

    // Get the minimum & maximum
    const x1_min = -sceneSize / 2;
    const x1_max = sceneSize / 2;
    const x2_min = -sceneSize / 2;
    const x2_max = sceneSize / 2;

    let lineStart = [0, 0, 0];
    let lineEnd = [0, 0, 0];

    // Ensure that the denominators do not go too low
    if (Math.abs(c2) > 0.1) {
        let x2_min_res = (-b - c1 * x1_min) / c2;
        let x2_max_res = (-b - c1 * x1_max) / c2;

        lineStart = [x1_min, 0, x2_min_res];
        lineEnd = [x1_max, 0, x2_max_res];

    } else if (Math.abs(c1) > 0.1) {
        let x1_min_res = (-b - c2 * x2_min) / c1;
        let x1_max_res = (-b - c2 * x2_max) / c1;

        lineStart = [x1_min_res, 0, x2_min];
        lineEnd = [x1_max_res, 0, x2_max];
    } else {
        return;
    }

    // Format the line
    const vector = [lineEnd[0] - lineStart[0], 0, lineEnd[2] - lineStart[2]];
    const length = Math.sqrt(vector[0] ** 2 + vector[2] ** 2);
    const norm = [vector[0] / length, 0, vector[2] / length];
    const midpoint = [(lineStart[0] + lineEnd[0]) / 2, 0, (lineStart[2] + lineEnd[2]) / 2]

    const rotation_axis = `${norm[2]} 0 ${-norm[0]}`;
    const rotation_angle = "1.5708";

    const boundaryGroup = scene.append("Group")
        .attr("class", "decision-boundary-group");

    const transform = boundaryGroup.append("Transform")
        .attr("translation", midpoint.join(' '))
        .attr("rotation", `${rotation_axis} ${rotation_angle}`);

    const shape = transform.append("Shape");

    // Format the appearance of the line
    shape.append("Appearance")
        .append("Material")
        .attr("diffuseColor", color);

    shape.append("Cylinder")
        .attr("height", length)
        .attr("radius", "0.03");
}

function drawKnnPlane(scene, data, k, minimum, maximum) {
    scene.select(".knn-surface").remove();

    const resolution = 40; 
    const step = (maximum - minimum) / (resolution - 1);
    
    const vertices = [];
    const faces = [];
    const colors = [];

    // Create the KNN plane grid
    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            let grid_x1 = minimum + j * step;
            let grid_x2 = minimum + i * step;

            // Find the nearest neighbors
            const distances = data.map(d => ({
                distSq: (grid_x1 - d.x1) ** 2 + (grid_x2 - d.x2) ** 2,
                y: d.y
            }));

            distances.sort((a, b) => a.distSq - b.distSq);
            const neighbors = distances.slice(0, k);

            const predicted_y = d3.mean(neighbors, d => d.y);
            vertices.push(`${grid_x1} ${predicted_y} ${grid_x2}`);

            let t = (predicted_y + 2) / 4;
            t = Math.max(0, Math.min(1, t));

            // Push the color gradient
            const r = t;
            const g = t;
            const bCol = 1 - t;
            colors.push(`${r} ${g} ${bCol}`);
        }
    }

    // Push the faces of the KNN plane
    for (let i = 0; i < resolution - 1; i++) {
        for (let j = 0; j < resolution - 1; j++) {
            let p1 = i * resolution + j;
            let p2 = i * resolution + j + 1;
            let p3 = (i + 1) * resolution + j + 1;
            let p4 = (i + 1) * resolution + j;
            
            faces.push(`${p1} ${p2} ${p3} ${p4} -1`);
        }
    }

    const shape = scene.append("Shape")
        .attr("class", "knn-surface");

    // Format the plane
    shape.append("Appearance")
        .append("Material")
        .attr("transparency", "0.2");

    const faceShape = shape.append("IndexedFaceSet")
        .attr("solid", "false") 
        .attr("colorPerVertex", "true") 
        .attr("coordIndex", faces.join(' '));

    faceShape.append("Coordinate")
        .attr("point", vertices.join(' '));
        
    faceShape.append("Color")
        .attr("color", colors.join(' '));
}