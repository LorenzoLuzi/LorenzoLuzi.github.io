// ============================================================================
// dataLoader.js  —  shared data acquisition for all STAT 413 applets.
//
//  getData(key, producer): runs producer() ONCE per key and caches the result;
//      every later call with the same key reuses it (no re-fetch / re-generate).
//      producer() may return a value (synthetic data) or a Promise (loaded CSV).
//  loadCSV(url): cached d3.csv loader, keyed by URL so a dataset can be shared
//      across plots and is fetched only once.
//  DataGen.*: each plot's data generator, moved here from its page.
// ============================================================================

const _dataCache = {};

function getData(key, producer) {
  if (!(key in _dataCache)) {
    _dataCache[key] = producer();
  }
  return _dataCache[key];
}

function loadCSV(url) {
  return getData(url, () => d3.csv(url));
}

const DataGen = {

  decisionTree(numPoints) {
      // Generate 3-class data with the grid being divided into three classes
      const rand = d3.randomLcg(42);
      const norm = d3.randomNormal.source(rand)(0, 0.8);
      const data = [];
    
      const pointsPerClass = Math.floor(numPoints / 3);
    
      // Class 0: cluster around (-1, -1)
      for (let i = 0; i < pointsPerClass; i++) {
          data.push({
              x1: -1 + norm(),
              x2: -1 + norm(),
              label: 0,
              marker: 'o',
              color: classColors[0]
          });
      }
    
      // Class 1: cluster around (1, -1)
      for (let i = 0; i < pointsPerClass; i++) {
          data.push({
              x1: 1 + norm(),
              x2: -1 + norm(),
              label: 1,
              marker: 'o',
              color: classColors[1]
          });
      }
    
      // Class 2: cluster around (0, 1.5)
      for (let i = 0; i < numPoints - 2 * pointsPerClass; i++) {
          data.push({
              x1: 0 + norm(),
              x2: 1.5 + norm(),
              label: 2,
              marker: 'o',
              color: classColors[2]
          });
      }
    
      return data;
  },

  knn1d(xmax, xmin, totalPoints) {
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
  },

  knn2d(totalPoints) {
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
  },

  logistic2d(totalPoints) {
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
  },

  logistic3d(totalPoints) {
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
  },

  multilinear(n, c2, c1, b) {
      // Generate uniform data for this plot.
      const points = [];
      const rand = d3.randomLcg(42);
      while(points.length < n) {
          const x1 = (rand() - 0.5) * 10;
          const x2 = (rand() - 0.5) * 10;

          const y = c2 * x1 + c1 * x2 + b + (rand() - 0.5) * 2;

          if (y >= -5 && y <= 5) {
              points.push({ x1 : x1, x2 : x2, y : y });
          }
      }
      return points;
  },

  multinomial(basePoints) {

      // Setting up class counts for loops
      const class0Count = Math.floor(basePoints / 2);
      const class1Count = basePoints - class0Count;
      const class2Count = basePoints - class0Count;

      // Using d3 seeded random number generator
      const rand = d3.randomLcg(42);
      const data = [];

      const rand0 = d3.randomNormal.source(rand)(-2, 1);
      const rand1 = d3.randomNormal.source(rand)(0.5, 1);
      const rand2 = d3.randomNormal.source(rand)(5, 1);

      // Generating points
      for (let i = 0; i < class0Count; i++) {
          data.push({ x: rand0(), label: 0 });
      }

      for (let i = 0; i < class1Count; i++) {
          data.push({ x: rand1(), label: 1 });
      }

      for (let i = 0; i < class2Count; i++) {
          data.push({ x: rand2(), label: 2 });
      }

      // Calculating some values for the bounds of the graph
      const xValues = data.map(point => point.x);
      const xmin = d3.min(xValues);
      const xmax = d3.max(xValues);
      const range = xmax - xmin || 1;

      return {
          data: data,
          xlims: [xmin - 0.1 * range, xmax + 0.1 * range]
      };
  },

  multinomial2c(basePoints) {

      // Setting up class counts for loops
      const class0Count = Math.floor(basePoints / 3);
      const class1Count = Math.floor(basePoints / 3);
      const class2Count = basePoints - class0Count - class1Count;

      // Using d3 seeded random number generator
      const rand = d3.randomLcg(42);
      const rand0 = d3.randomNormal.source(rand)(-2, 1);
      const rand1 = d3.randomNormal.source(rand)(0.5, 1);
      const rand2 = d3.randomNormal.source(rand)(5, 1);

      const x1 = [];
      const x2 = [];

      // Generating feature values for x1
      for (let i = 0; i < class0Count; i++) {
          x1.push(rand0());
      }

      for (let i = 0; i < class1Count; i++) {
          x1.push(rand1());
      }

      for (let i = 0; i < class2Count; i++) {
          x1.push(rand2());
      }

      // Generating feature values for x2
      for (let i = 0; i < class0Count; i++) {
          x2.push(rand0());
      }

      for (let i = 0; i < class1Count; i++) {
          x2.push(rand1());
      }

      for (let i = 0; i < class2Count; i++) {
          x2.push(rand2());
      }

      // Equivalent to:
      // np.concatenate([np.zeros_like(x0), np.zeros_like(x1) + 1, np.zeros_like(x2) + 2])
      const y = [
          ...Array(class0Count).fill(0),
          ...Array(class1Count).fill(1),
          ...Array(class2Count).fill(2)
      ];

      const data = y.map((label, index) => ({
          x1: x1[index],
          x2: x2[index],
          label: label
      }));

      // Calculating bounds for both axes
      const x1min = d3.min(x1);
      const x1max = d3.max(x1);
      const x1range = x1max - x1min || 1;

      const x2min = d3.min(x2);
      const x2max = d3.max(x2);
      const x2range = x2max - x2min || 1;

      return {
          data: data,
          x1: x1,
          x2: x2,
          y: y,
          x1lims: [x1min - 0.1 * x1range, x1max + 0.1 * x1range],
          x2lims: [x2min - 0.1 * x2range, x2max + 0.1 * x2range]
      };
  },

  simplePoly(xmax, xmin, totalPoints) {
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

};
