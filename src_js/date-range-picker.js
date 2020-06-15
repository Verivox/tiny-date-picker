// A date range picker built on top of TinyDatePicker;
import TDP from './index';
import Emitter from './lib/emitter';
import {shiftMonth, datesEq} from './lib/date-manip';
import {cp} from './lib/fns';

export const TinyDatePicker = TDP;

/**
* The state values for the date range picker
*
* @typedef {Object} DateRangeState
* @property {Date} start - The start date (can be null)
* @property {Date} end - The end date (can be null)
*/

/**
* An instance of TinyDatePicker
*
* @typedef {Object} DateRangePickerInst
* @property {DateRangeState} state - The start / end dates
* @property {function} on - Adds an event handler
* @property {function} off - Removes an event handler
* @property {function} setState - Changes the current state of the date picker
*/

/**
 * TinyDatePicker constructs a new date picker for the specified input
 *
 * @param {HTMLElement} input The input associated with the datepicker
 * @returns {DateRangePickerInst}
 */
export function DateRangePicker(container, opts) {
  opts = opts || {};
  const emitter = Emitter();
  const root = renderInto(container);
  let hoverDate;
  const state = {
    start: undefined,
    end: undefined,
  };
  const start = TDP(root.querySelector('.dr-cal-start'), cp({}, opts.startOpts, {
    mode: 'dp-permanent',
    dateClass: dateClass,
  }));
  const end = TDP(root.querySelector('.dr-cal-end'), cp({}, opts.endOpts, {
    mode: 'dp-permanent',
    hilightedDate: shiftMonth(start.state.hilightedDate, 1),
    dateClass: dateClass,
  }));
  const handlers = {
    'statechange': onStateChange,
    'select': dateSelected,
  };
  const me = {
    state: state,
    setState: setState,
    on: emitter.on,
    off: emitter.off,
  };

  start.on(handlers);
  end.on(handlers);

  function onStateChange(_, dp) {
    const d1 = start.state.hilightedDate;
    const d2 = end.state.hilightedDate;
    const diff = diffMonths(d1, d2);

    if (diff === 1) {
      return;
    }

    if (dp === start) {
      end.setState({
        hilightedDate: shiftMonth(dp.state.hilightedDate, 1),
      });
    } else {
      start.setState({
        hilightedDate: shiftMonth(dp.state.hilightedDate, -1),
      });
    }
  }

  function dateSelected(_, dp) {
    const dt = dp.state.selectedDate;

    if (!state.start || state.end) {
      setState({
        start: dt,
        end: undefined,
      });
    } else {
      setState({
        start: dt > state.start ? state.start : dt,
        end: dt > state.start ? dt : state.start,
      });
    }
  };

  function setState(newState) {
    for (const key in newState) {
      state[key] = newState[key];
    }

    emitter.emit('statechange', me);
    rerender();
  }

  function rerender() {
    start.setState({});
    end.setState({});
  }

  // Hack to avoid a situation where iOS requires double-clicking to select
  if (!/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    root.addEventListener('mouseover', function mouseOverDate(e) {
      if (e.target.classList.contains('dp-day')) {
        const dt = new Date(parseInt(e.target.dataset.date));
        const changed = !datesEq(dt, hoverDate);

        if (changed) {
          hoverDate = dt;
          rerender();
        }
      }
    });
  }

  function dateClass(dt) {
    const rangeClass = (state.end || hoverDate) &&
                     state.start &&
                     inRange(dt, state.end || hoverDate, state.start);
    const selectedClass = datesEq(dt, state.start) || datesEq(dt, state.end);

    return (rangeClass ? 'dr-in-range ' : '') +
           (selectedClass ? 'dr-selected ' : '');
  }

  return me;
}

function renderInto(container) {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }

  container.innerHTML = '<div class="dr-cals">' +
    '<div class="dr-cal-start"></div>' +
    '<div class="dr-cal-end"></div>' +
    '</div>';

  return container.querySelector('.dr-cals');
}

function toMonths(dt) {
  return (dt.getYear() * 12) + dt.getMonth();
}

function diffMonths(d1, d2) {
  return toMonths(d2) - toMonths(d1);
}

function inRange(dt, start, end) {
  return (dt < end && dt >= start) || (dt <= start && dt > end);
}