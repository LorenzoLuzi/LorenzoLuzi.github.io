function removePlot(plot) {
    // Remove the plot if it alread exists (e.g., if we refresh it)
    d3.select(plot).selectAll("*").remove();
}

function appendSvg(plot, width, height, margin) {
    // Append the svg object to the body of the page
    var svg = d3.select(plot)
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    return svg;
}

function addTitle(text, plot, space_below="0px") {
    const titleId = plot.substring(1) + "-title"; 
    d3.select("#" + titleId).remove();

    // Select which plot to add the title to.
    const target = d3.select(plot);
    if (target.empty()) {
        console.error("Title target not found:", targetSelector);
        return;
    }

    // Create the title.
    const titleElement = d3.create("h2")
        .attr("id", titleId)
        .style("font-family", "Arial, sans-serif")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .style("text-align", "center")
        .style("margin-top", "50px")
        .style("margin-bottom", space_below)
        .text(text)
        .node(); 

    // Add the title before the plot.
    target.node().prepend(titleElement);
}

function addLegendEntry(plot, label, type, color, posTop, posRight) {
    let legend = d3.select("#legend");
    if (legend.empty()) {
        const plotElement = d3.select(plot).node();
        if (!plotElement) {
            console.error("Plot element not found:", plotId);
            return;
        }

        // Draw a rectangle around the legend
        const plotRect = plotElement.getBoundingClientRect();

        // Get the legend positions
        const legendTop = plotRect.top + posTop; 
        const legendLeft = plotRect.right + posRight; 

        // Add the legend boundary
        legend = d3.select("body").append("div")
            .attr("id", "legend") 
            .style("position", "absolute")
            .style("top", `${legendTop}px`)      
            .style("left", `${legendLeft}px`)    
            .style("background-color", "rgba(255, 255, 255, 0.9)")
            .style("padding", "15px 20px")
            .style("border", "1px solid #000")
            .style("font-size", "18px")
            .style("font-family", "Arial, sans-serif");
    }

    // Add a legend item
    const legendItem = legend.append("div")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center");

    legend.selectAll(".legend-item").style("margin-bottom", "10px");
    legend.select(".legend-item:last-child").style("margin-bottom", "0");

    const icon = legendItem.append("span")
        .style("display", "inline-block")
        .style("width", "15px")
        .style("height", "15px")
        .style("margin-right", "8px")
        .style("border", "1px solid rgba(0,0,0,0.2)");

    // Different shape scenarios
    if (type === 'circle') {
        icon.style("background-color", color).style("border-radius", "50%");
    } else if (type === 'line') { 
        icon.style("background-color", color).style("height", "3px").style("border", "none");
    } else if (type === 'x') { 
        icon.style("background-color", "transparent") 
            .style("color", color) 
            .style("font-size", "1.6em") 
            .style("font-weight", "bold")
            .style("line-height", "0.8") 
            .style("border", "none")
            .html("&times;");
    } else { 
        icon.style("background-color", color);
    }
    
    legendItem.append("span").text(label);
}
