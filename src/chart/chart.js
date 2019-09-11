import fs from 'fs';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import * as linechartSpec from './linechartlite.json'
import * as linechartSpecMulti from './linechartlitemulti.json'
import * as vegaThemes from 'vega-themes';
import moment from 'moment';
import { getName, dbg } from '../util';

process.env["NTBA_FIX_350"] = 1;

const writeErr = err => {
  if(err) console.error('Error writing PNG to file:\n' + err);
}

export const genLineChart = (msg, bot, data, group) => {
  dbg(msg.from, 'Generating graph')
  const graphData = [];
  let accumValue = 0;
  for (let i = 0; i < data.length; i++) {
    graphData.push({
      "poodate": data[i].start,
      "value": accumValue,
      "user": getName(msg.from),
    })
    accumValue += data[i].val;
    graphData.push({
      "poodate": data[i].finish,
      "value": accumValue,
      "user": getName(msg.from),
    })
  }
  graphData.push({
    "poodate": moment().utc().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
    "value": accumValue,
    "user": getName(msg.from),
  })

  const spec = group ? linechartSpecMulti : linechartSpec;
  spec.title = `Dump records for ${group ? `poosquad ${msg.chat.title}` : getName(msg.from)}`;
  spec.data = {
    values: graphData
  };
  const lspec = vegaLite.compile(spec).spec;

  dbg(msg.from, 'Init graph view')
  const view = new vega
    .View(vega.parse(lspec, vegaThemes.dark))
    .renderer('none')
    .initialize();

  dbg(msg.from, 'Attempt to generate')
  view
    .toCanvas(3)
    .then(function (canvas) {
      const relativeDir = `src/chart/img/${msg.chat.id}`
      const fileName = 'linechart.png';
      dbg(msg.from, `Making directory ${relativeDir}`)
      fs.mkdir(relativeDir, { recursive: true }, writeErr);
      dbg(msg.from, `Writing buffer to ${relativeDir}/${fileName}`)
      fs.writeFile(`${relativeDir}/${fileName}`, canvas.toBuffer(), err => {
        if(err) {
          writeErr(err);
          return;
        }
        try {
          bot.sendPhoto(
            msg.chat.id,
            `${__dirname}\\img\\${msg.chat.id}\\${fileName}`,
            { caption: `You've slammed ${accumValue.toFixed(2)}€ down the drain.\nKeep going! 💩` }
          );
        } catch (error) {
          dbg(msg.from, `Failed to send graph at ${__dirname}\\img\\${msg.chat.id}\\${fileName}`);
        } 
      })
    })
    .catch(writeErr)
}
