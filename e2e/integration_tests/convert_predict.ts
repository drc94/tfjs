/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

/**
 * This file is 2/2 of the test suites for CUJ: convert->predict.
 *
 * This file does below things:
 *  - Load graph models using Converter api.
 *  - Load inputs.
 *  - Make inference using each backends, and validate the results against TF
 *    results.
 */

import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';

import * as tfconverter from '@tensorflow/tfjs-converter';
import * as tfc from '@tensorflow/tfjs-core';

import {BACKENDS, GRAPH_MODELS, KARMA_SERVER, REGRESSION} from './constants';
import {createInputTensors} from './test_util';

const DATA_URL = 'convert_predict_data';

describe(`${REGRESSION} convert_predict`, () => {
  GRAPH_MODELS.forEach(model => {
    describe(`${model}`, () => {
      let inputsData: tfc.TypedArray[];
      let inputsShapes: number[][];
      let tfOutputData: tfc.TypedArray[];
      let tfOutputShapes: number[][];

      beforeAll(async () => {
        [inputsData, inputsShapes, tfOutputData, tfOutputShapes] =
            await Promise.all([
              fetch(`${KARMA_SERVER}/${DATA_URL}/${model}.xs-data.json`)
                  .then(response => response.json()),
              fetch(`${KARMA_SERVER}/${DATA_URL}/${model}.xs-shapes.json`)
                  .then(response => response.json()),
              fetch(`${KARMA_SERVER}/${DATA_URL}/${model}.ys-data.json`)
                  .then(response => response.json()),
              fetch(`${KARMA_SERVER}/${DATA_URL}/${model}.ys-shapes.json`)
                  .then(response => response.json())
            ]);
      });

      BACKENDS.forEach(backend => {
        it(`with ${backend}.`, async () => {
          const $model = await tfconverter.loadGraphModel(
              `${KARMA_SERVER}/${DATA_URL}/${model}/model.json`);

          const xs = createInputTensors(inputsData, inputsShapes);

          await tfc.setBackend(backend);

          const result = await $model.executeAsync(xs);

          const ys =
              ($model.outputs.length === 1 ? [result] : result) as tfc.Tensor[];

          // Validate outputs with tf results.
          for (let i = 0; i < ys.length; i++) {
            const y = ys[i];
            expect(y.shape).toEqual(tfOutputShapes[i]);
            tfc.test_util.expectArraysClose(await y.data(), tfOutputData[i]);
          }

          // Dispose all tensors;
          xs.forEach(tensor => tensor.dispose());
          ys.forEach(tensor => tensor.dispose());
        });
      });
    });
  });
});
