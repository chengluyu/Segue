(function(mds) {
    "use strict";

    mds.classic = function(distances, labels) {

        // square distances
        var M = numeric.mul(-0.5, numeric.pow(distances, 2));

        // double centre the rows/columns
        function mean(A) { return numeric.div(numeric.add.apply(null, A), A.length); }
        var rowMeans = mean(M), colMeans = mean(numeric.transpose(M)), totalMean = mean(rowMeans);

        for (var i = 0; i < M.length; ++i) {
            for (var j =0; j < M[0].length; ++j) {
                M[i][j] += totalMean - rowMeans[i] - colMeans[j];
            }
        }

        // take the SVD of the double centred matrix, and return the points from it
        var ret = numeric.svd(M), eigenValues = numeric.sqrt(ret.S);
        var mdsResult = ret.U.map(function(row) {
            return numeric.mul(row, eigenValues).splice(0, 2);
        });

        // create final result
        var transposeResult = numeric.transpose(mdsResult);
        var finalResult = []; // array of object
        for (var i = 0; i < labels.length; i++) {
            var x = transposeResult[0][i];
            var y = transposeResult[1][i];

            finalResult.push({ label: labels[i], x: x, y: y });
        }

        return finalResult;
    };
}(window.mds = window.mds || {}));

