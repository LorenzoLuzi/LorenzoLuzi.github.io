function getMinMax(data, predictY) {
    // Return the min and max given the predictY regression function
    let xmin = data[0].x;
    let xmax = data[0].x;
    let ymin = data[0].y ** 2;
    let ymax = 15.1; // Default value
    for (var i = 0; i < data.length; i++) {
        // Set variables
        let x = data[i].x;
        let y = data[i].y;

        // Check ranges of data points
        if (xmin > x){xmin = x}
        if (xmax < x){xmax = x}
        if (ymin > y){ymin = y}
        if (ymax < y){ymax = y}

        // Check ranges of estimate
        if (ymin > (predictY(x))){ymin = predictY(x)}
        if (ymax < (predictY(x))){ymax = predictY(x)}
    }

    return { xmin, xmax, ymin, ymax };
}

function drawGridlines(dash_size, gap_size, width, height, color_grid) {
    // Draw gridlines throughout the image
    d3.selectAll("g.yClass g.tick")
        .append("line")
        .attr("class", "gridline")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", width)
        .attr("y2", 0)
        .attr("stroke", color_grid) 
        .attr("stroke-dasharray",`${dash_size},${gap_size}`)

    d3.selectAll("g.xClass g.tick")
        .append("line")
        .attr("class", "gridline")
        .attr("x1", 0)
        .attr("y1", -height)
        .attr("x2", 0)
        .attr("y2", 0)
        .attr("stroke", color_grid) 
        .attr("stroke-dasharray",`${dash_size},${gap_size}`)
}

function drawResiduals(svg, data, color_residuals, x, y, predictY) {
    // Draw residuals, where predictY is the regression function
    svg.selectAll(".error")
        .data(data)
        .enter()
        .append('path')
        .attr("fill", "none")
        .attr("stroke", color_residuals)
        .attr("stroke-width", 3.5)
        .attr("d", function(d) {
            const predictedY = predictY(d.x);
            return d3.line()
                .x(p => x(p.x))
                .y(p => y(p.y))
                ([{ x: d.x, y: d.y }, { x: d.x, y: predictedY }]);
        })
        .attr("class", "error");
}

function drawDecisionBoundary2D(svg, x_scale, y_scale, c1, c2, b, color) {
    // Note the boundaries of the plot
    const x_range = x_scale.range();
    let x_left = x_scale.invert(x_range[0]); 
    let x_right = x_scale.invert(x_range[1]);    

    let y_left = -(c1 / c2) * x_left - (b / c2);
    let y_right = -(c1 / c2) * x_right - (b / c2);

    x_left = x_scale(x_left);
    x_right = x_scale(x_right);
    y_left = y_scale(y_left);
    y_right = y_scale(y_right);

    // Draw the horizontal line
    svg.append("line")
        .attr("x1", x_left)
        .attr("y1", y_left) 
        .attr("x2", x_right)
        .attr("y2", y_right)     
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6, 4")
        .attr("stroke-opacity", 0.6);
}

function drawVerticalLine(svg, x_scale, y_scale, x_value, color) {
    // Note the boundaries of the plot
    const x_coord = x_scale(x_value);
    const y_range = y_scale.range();
    const y_bottom = y_range[0]; 
    const y_top = y_range[1];    

    // Draw the vertical line
    svg.append("line")
        .attr("x1", x_coord)
        .attr("y1", y_bottom) 
        .attr("x2", x_coord)
        .attr("y2", y_top)     
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6, 4")
        .attr("stroke-opacity", 0.6);

    // Draw the triangle
    svg.append("polygon")
        .attr("points", `${x_coord - 7}, ${y_bottom} ${x_coord + 7}, ${y_bottom} ${x_coord}, ${y_bottom - 15}`)
        .attr("fill", "red");
}

function drawEstimateLine(svg, x, y, xmin, xmax, predictY, color_estimate, numPoints = 100) {
    // Multiple points to draw line/curve
    const lineData = [];
    const step = (xmax - xmin) / (numPoints - 1);
    for (let i = 0; i < numPoints; i++) {
        let px = parseFloat(xmin) + i * step;
        lineData.push({ x: px, y: predictY(px) });
    }

    // Draw the line
    svg.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", color_estimate)
        .attr("stroke-width", 3.5)
        .attr("d", d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y))
            .curve(d3.curveMonotoneX) // Smooth curve
        );
}

function addDots(svg, data, x, y, color_data, x2_present=false) {
    // Add dots to the plot
    const circleGenerator = d3.symbol()
        .type(d3.symbolCircle)
        .size(60); 

    const squareGenerator = d3.symbol()
        .type(d3.symbolSquare)
        .size(60);

    svg.append('g')
    .selectAll("dot")
    .data(data)
    .enter()
    .append("path") 
    .attr("transform", function (d) {
        if (x2_present) {
            return "translate(" + x(d.x1) + "," + y(d.x2) + ")";
        }
        return "translate(" + x(d.x) + "," + y(d.y) + ") rotate(45)";
    })
    .attr("d", function(d) {
        if (d.marker === undefined || d.marker === 'o') {
            return circleGenerator();
        } else if (d.marker === 'x') {
            return squareGenerator(); 
        }
    })
    .style("fill", function(d) {
        if (d.color === undefined) {
            return color_data;
        }
        return d.color;
    });
}

function drawKnnCurve(svg, data, k, xScale, yScale, xmin, xmax) {
    const xtemp = d3.range(xmin, xmax, (xmax - xmin) / 300);
    const ytemp = xtemp.map(x0 => {
        const distances = data.map(d => ({
            d2: (x0 - d.x) ** 2,
            y: d.y
        }));

        distances.sort((a, b) => a.d2 - b.d2);
        const closest = distances.slice(0, k);

        return { x: x0, y: d3.mean(closest, d => d.y) };
    });

    svg.append("path")
        .datum(ytemp)
        .attr("fill", "none")
        .attr("stroke", "orange")
        .attr("stroke-width", 3)
        .attr("d", d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))
        );
}

function calcError(data, predictY) {
    // Calculate the error (predictY is the regression function)
    let error = 0;
    for (let i = 0; i < data.length; i++) {
        error += Math.abs(data[i].y - predictY(data[i].x)) / data.length;
    }
    return error;
}

function addYLabel(svg, font, height, margin, text) {
    // Add the y-axis label
    svg.append("text")
        .attr("font-family", font)
        .style("font-size", "16px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height/2)
        .attr("y", margin)
        .text(text)
}

function addXLabel(svg, font, width, height, margin, text) {
    // Add the x-axis label
    svg.append("text")
        .attr("font-family", font)
        .style("font-size", "16px")
        .attr("text-anchor", "middle")
        .attr("x", width/2)
        .attr("y", height+margin.bottom/2)
        .text(text)
}

function addXAxis(svg, xmin, xmax, width, height) {
    // Add x axis
    var x = d3.scaleLinear()
        .domain([xmin, xmax])
        .range([ 0, width ]);
    svg.append("g")
        .attr("class", "xClass")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5));
    // Top x axis
    var x2 = d3.scaleLinear()
        .domain([])
        .range([ 0, width ]);
    svg.append("g")
        .call(d3.axisTop(x2));

    return x;
}

function addYAxis(svg, ymin, ymax, width, height) {
    // Add y axis
    var y = d3.scaleLinear()
        .domain([ymin, ymax])
        .range([ height, 0]);
    svg.append("g")
        .attr("class", "yClass")
        .call(d3.axisLeft(y));
    // Right y axis
    var y2 = d3.scaleLinear()
        .domain([])
        .range([ height, 0]);
    svg.append("g")
        .call(d3.axisRight(y2))
        .attr("transform", `translate(${width},0)`);

    return y;
}

function addYAxisLabels(svg, ymin, ymax, width, height) {
    // Add right-side label at bottom
    svg.append("text")
        .attr("x", width + 10) 
        .attr("y", ymin + height + 3)   
        .text("0")
        .style("font-size", "12px")
        .attr("fill", "black")
        .attr("text-anchor", "start"); 

    // Add right-side label at top
    svg.append("text")
        .attr("x", width + 10) 
        .attr("y", ymax + 3) 
        .text("1")
        .style("font-size", "12px")
        .attr("fill", "black")
        .attr("text-anchor", "start"); 
}

function drawColorBar(idSuffix, min, max, top, left, title) {
    d3.select(`.colorbar-${idSuffix}`).remove();

    const width = 100;
    const height = 200;
    const margin = { left: 40, right: 40, top: 35, bottom: 20 };
    const barWidth = 20;
    const barHeight = height - margin.top - margin.bottom;

    const svg = d3.select("body")
        .append("svg")
        .attr("class", `colorbar-${idSuffix}`) 
        .attr("width", width)
        .attr("height", height)
        .style("position", "absolute") 
        .style("top", top + "px")      
        .style("left", left + "px")    
        .style("z-index", "1000");

    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "gradient-" + idSuffix)
        .attr("x1", "0%")
        .attr("y1", "100%") 
        .attr("x2", "0%")
        .attr("y2", "0%");

    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#0000ff")
        .attr("stop-opacity", "0.3"); 

    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#ffff00")
        .attr("stop-opacity", "0.3"); 

    svg.append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", barWidth)
        .attr("height", barHeight)
        .style("fill", `url(#gradient-${idSuffix})`)
        .style("stroke", "#ccc");

    svg.append("text")
        .attr("x", margin.left + barWidth / 2)
        .attr("y", margin.top - 10)            
        .attr("text-anchor", "middle")         
        .style("font-family", "Arial, sans-serif")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(title);

    const yScale = d3.scaleLinear()
        .domain([min, max])
        .range([height - margin.bottom, margin.top]); 

    const yAxis = d3.axisRight(yScale)
        .ticks(5);

    svg.append("g")
        .attr("transform", `translate(${margin.left + barWidth}, 0)`)
        .call(yAxis);
}