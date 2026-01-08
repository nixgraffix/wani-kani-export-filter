import { useState, useEffect } from 'react';
import { UI_STRINGS } from '../strings';

function LevelRangeSlider({ min, max, value, onChange }) {
  const [minVal, setMinVal] = useState(value?.min || min);
  const [maxVal, setMaxVal] = useState(value?.max || Math.min(min + 2, max));

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      setMinVal(value.min);
      setMaxVal(value.max);
    }
  }, [value]);

  useEffect(() => {
    onChange({ min: minVal, max: maxVal });
  }, [minVal, maxVal]);

  const handleMinChange = (e) => {
    const value = Math.min(Number(e.target.value), maxVal);
    setMinVal(value);
  };

  const handleMaxChange = (e) => {
    const value = Math.max(Number(e.target.value), minVal);
    setMaxVal(value);
  };

  const getPercent = (value) => ((value - min) / (max - min)) * 100;

  return (
    <div className="range-slider">
      <div className="range-values">
        {minVal === maxVal ? (
          <span>{UI_STRINGS.LEVEL_SINGLE} {minVal}</span>
        ) : (
          <>
            <span>{UI_STRINGS.LEVEL_SINGLE} {minVal}</span>
            <span>{UI_STRINGS.LEVEL_RANGE_TO}</span>
            <span>{UI_STRINGS.LEVEL_SINGLE} {maxVal}</span>
          </>
        )}
      </div>

      <div className="slider-container">
        <input
          type="range"
          min={min}
          max={max}
          value={minVal}
          onChange={handleMinChange}
          className="thumb thumb-left"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={maxVal}
          onChange={handleMaxChange}
          className="thumb thumb-right"
        />

        <div className="slider-track" />
        <div
          className="slider-range"
          style={{
            left: `${getPercent(minVal)}%`,
            width: `${getPercent(maxVal) - getPercent(minVal)}%`
          }}
        />
      </div>
    </div>
  );
}

export default LevelRangeSlider;
