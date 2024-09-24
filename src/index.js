import {hsv2rgb, rgbString} from '@kurkle/color';

function* hueGen() {
  yield 0;
  while (true) {
    for (let i = 1; i < 10; i++) {
      const d = 1 << i;
      for (let j = 1; j <= d; j += 2) {
        yield j / d;
      }
    }
  }
}

function* colorGen(repeat = 1, brightnessValues = null) {
  const hue = hueGen();
  let h = hue.next();
  while (!h.done) {
    if (!brightnessValues || brightnessValues.length === 0) {
		  brightnessValues = [0.8, 0.5];
	  }
    for (let brightnessValue of brightnessValues) {
      let rgb = hsv2rgb(Math.round(h.value * 360), 0.6, brightnessValue);
      for (let i = 0; i < repeat; i++) {
        yield {background: rgbString({r: rgb[0], g: rgb[1], b: rgb[2], a: 192}), border: rgbString({r: rgb[0], g: rgb[1], b: rgb[2], a: 144})};
      }
    }
    h = hue.next();
  }
}

function setColors(dataset, background, border, mode) {
  if (mode === 'data') {
    dataset.backgroundColor = background;
    dataset.border = border;
  } else {
    dataset.backgroundColor = dataset.backgroundColor || background;
    dataset.borderColor = dataset.borderColor || border;
  }
  return dataset.backgroundColor === background || dataset.borderColor === border;
}

function getNext(color, customize, context) {
  const c = color.next().value;
  if (typeof customize === 'function') {
    return customize(Object.assign({colors: c}, context));
  }
  return c;
}

function defaultMode(chart, gen, customize, mode) {
  const datasetMode = mode === 'dataset';

  let c = getNext(gen, customize, {chart, datasetIndex: 0, dataIndex: datasetMode ? undefined : 0});
  for (const dataset of chart.data.datasets) {
    if (datasetMode) {
      if (setColors(dataset, c.background, c.border, mode)) {
        c = getNext(gen, customize, {chart, datasetIndex: dataset.index});
      }
    } else {
      const background = [];
      const border = [];
      for (let i = 0; i < dataset.data.length; i++) {
        background.push(c.background);
        border.push(c.border);
        c = getNext(gen, customize, {chart, datasetIndex: dataset.index, dataIndex: i});
      }
      setColors(dataset, background, border, mode);
    }
  }

}

function labelMode(chart, gen, customize, mode) {
  const colors = {};
  for (const dataset of chart.data.datasets) {
    const label = dataset.label ?? '';
    if (!colors[label]) {
      colors[label] = getNext(gen, customize, {chart, datasetIndex: 0, dataIndex: undefined, label});
    }
    const c = colors[label];
    setColors(dataset, c.background, c.border, mode);
  }
}

const autocolorPlugin = {
  id: 'autocolors',
  beforeUpdate(chart, args, options) {
    const {mode = 'dataset', enabled = true, customize, repeat, values} = options;

    if (!enabled) {
      return;
    }

    const gen = colorGen(repeat, values);

    if (options.offset) {
      // offset the color generation by n colors
      for (let i = 0; i < options.offset; i++) {
        gen.next();
      }
    }

    if (mode === 'label') {
      return labelMode(chart, gen, customize, mode);
    }
    return defaultMode(chart, gen, customize, mode);
  },
};

export {autocolorPlugin as default};
