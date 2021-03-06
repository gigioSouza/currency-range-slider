(function () {
  'use strict';
  
  window.CurrencyRangeSlider = CurrencyRangeSlider;
  
  function CurrencyRangeSlider(elementId, config) {
    var CLASS = 'class';
    var CLICK = 'click';
    var DESTROY = 'destroy';
    var DIV = 'div';
    var ENTER_KEY_CODE = 13;
    var FOCUS_OUT = 'focusout';
    var HIDDEN = 'hidden';
    var INLINE_BLOCK = 'inline-block';
    var INPUT = 'input';
    var KEY_UP = 'keyup';
    var MAX = 'max';
    var MIN = 'min';
    var MOUSE_DOWN = 'mousedown';
    var MOUSE_MOVE = 'mousemove';
    var MOUSE_UP = 'mouseup';
    var NONE = 'none';
    var ON_TOUCH_START = 'ontouchstart';
    var RANGE_CHANGE = 'rangeChange';
    var REGEXP_PCT = /%/;
    var RESIZE = 'resize';
    var SET_RANGE = 'setRange';
    var SPAN = 'span';
    var TOUCH_START = 'touchstart';
    var TOUCH_MOVE = 'touchmove';
    var TOUCH_END = 'touchend';
    var TYPE = 'type';
    var VISIBLE = 'visible';
    
    var debounceTime = 600;
    var editingMinValue = false, editingMaxValue = false, editingJoinedValue = false;
    var inputEnter = false;
    var isMobile = false;
    var labelPrefix = '';
    var limitToRange = true;
    var valueFormatter = defaultValueFormatter;
    var valueParser = defaultValueParser;
    
    var colors;
    var labelMin, labelMax;
    var minViewer, maxViewer;
    var joinedViewer, joinedViewerInputs;
    var minViewerView, maxViewerView, viewJoinedValue;
    var minViewerInput, maxViewerInput, joinedViewerMinInput, joinedViewerMaxInput;
    var maxSlider, maxRange;
    var minSlider, minRange;
    var range;
    var rangeHighlight;
    var rootElement;
    var sliderWidth;
    var rangeContainer, sliderRadius;
    var resolvedOnMinInputKeyUp;
    var resolvedOnMaxInputKeyUp;
    var resolvedOnJoinedInputKeyUp;
    var resolvedDispatchRangeChange = debounce(dispatchRangeChange, 100);
    
    init();
    
    function compareToMaxSlider(minSliderX, rangeContainerRect) {
      var maxSliderX = getSliderRectX(maxSlider);
      return minSliderX >= (maxSliderX - rangeContainerRect.left);
    }
    
    function compareToMinSlider(maxSliderX, rangeContainerRect) {
      var minSliderX = getSliderRectX(minSlider);
      return maxSliderX <= (minSliderX - rangeContainerRect.left);
    }
    
    function defaultValueFormatter(value) {
      if (isNull(value)) {
        return '';
      }
      value = value.toFixed(2);
      return value.replace(/\./, ',');
    }
    
    function defaultValueParser(value) {
      if (isNull(value)) {
        return 0;
      }
      value = value.replace(/\./, '');
      value = value.replace(/,/, '.');
      return +value;
    }
    
    function dispatchDestroy() {
      window.removeEventListener(RESIZE, onWindowResize, true);
      window.removeEventListener(MOUSE_UP, onWindowMouseUp, true);
      
      rootElement.removeEventListener(SET_RANGE, setRange, true)
      rootElement.removeEventListener(DESTROY, dispatchDestroy, true);
      rootElement.removeEventListener(MOUSE_MOVE, onMinSliderMouseMove, true);
      rootElement.removeEventListener(MOUSE_MOVE, onMaxSliderMouseMove, true);
      
      minSlider.removeEventListener(MOUSE_DOWN, onMinSliderMouseDown, true);
      maxSlider.removeEventListener(MOUSE_DOWN, onMaxSliderMouseDown, true);
      minViewerView.removeEventListener(CLICK, toggleMinEditingMode, true);
      maxViewerView.removeEventListener(CLICK, toggleMaxEditingMode, true);
      viewJoinedValue.removeEventListener(CLICK, toggleJoinedEditingMode, true);
      minViewerInput.removeEventListener(FOCUS_OUT, toggleMinEditingMode, true);
      minViewerInput.removeEventListener(KEY_UP, resolvedOnMinInputKeyUp, true);
      maxViewerInput.removeEventListener(FOCUS_OUT, toggleMaxEditingMode, true);
      maxViewerInput.removeEventListener(KEY_UP, resolvedOnMaxInputKeyUp, true);
      
      joinedViewerMinInput.removeEventListener(FOCUS_OUT, toggleMaxEditingMode, true);
      joinedViewerMinInput.removeEventListener(KEY_UP, resolvedOnMaxInputKeyUp, true);
      joinedViewerMaxInput.removeEventListener(FOCUS_OUT, toggleMaxEditingMode, true);
      joinedViewerMaxInput.removeEventListener(KEY_UP, resolvedOnMaxInputKeyUp, true);
      
      var destroyEvent = document.createEvent('Event');
      destroyEvent.initEvent(DESTROY, false, false);
      rootElement.dispatchEvent(destroyEvent);
    }
    
    function dispatchRangeChange() {
      var parsedRange = {
        min: valueParser(range.min),
        max: valueParser(range.max)
      };
      
      var rangeChangeEvent = document.createEvent('CustomEvent');
      rangeChangeEvent.initCustomEvent(RANGE_CHANGE, true, false, parsedRange);
      
      rootElement.dispatchEvent(rangeChangeEvent);
    }
    
    function getMaxSliderXPct() {
      return +maxSlider.style.left.replace(REGEXP_PCT, '');
    }
    
    function getMinSliderXPct() {
      return +minSlider.style.left.replace(REGEXP_PCT, '');
    }
    
    function getPointerX(event) {
      if (isMobile) {
        event = event.touches[0];
      }
      return event.clientX;
    }
    
    function getPointerXOnRangeContainer(pointerX, rangeContainerRect) {
      var rangeContainerX = rangeContainerRect.left;
      var rangeContainerFullWidth = rangeContainerX + rangeContainerRect.width;
      
      if (pointerX < (rangeContainerX + sliderRadius)) {
        pointerX = sliderRadius;
      } else if (pointerX > (rangeContainerFullWidth - sliderRadius)) {
        pointerX = rangeContainerRect.width - sliderRadius;
      } else {
        pointerX -= rangeContainerX;
      }
      return pointerX;
    }
    
    function getRangeContainerRect() {
      return rangeContainer.getBoundingClientRect();
    }
    
    function getRangePercentage(value) {
      return (100 * (value - minRange)) / (maxRange - minRange);
    }
    
    function getRangeValue(sliderPct) {
      return ((maxRange - minRange) * sliderPct / 100) + minRange;
    }
    
    function getSliderRectX(slider) {
      return getClientRect(slider).left + sliderRadius;
    }
    
    function init() {
      setupRootelement();
      setupDOM();
      setupDOMRefs();
      setupConfiguration();
      setupColors();
      setupLabels();
      setupSliderPositions();
      setupResolvedKeyUpEvents();
      setupMobileSupport();
      setupOutputEvents();
      setupInputEvents();
    }
    
    function onMaxSliderMouseDown() {
      rootElement.addEventListener(MOUSE_MOVE, onMaxSliderMouseMove, true);
    }
    
    function onMaxSliderMouseMove(event) {
      resolveMaxSliderMouseMove(getPointerX(event), true);
    }
    
    function onMinSliderMouseDown() {
      rootElement.addEventListener(MOUSE_MOVE, onMinSliderMouseMove, true);
    }
    
    function onMinSliderMouseMove(event) {
      resolveMinSliderMouseMove(getPointerX(event), true);
    }
    
    function onMaxInputKeyUp(event) {
      var value = event.target.value;
      
      if (validateInput(value)) {
        value = valueParser(value);
        
        var minValue = valueParser(range.min);
        var compare = minValue >= value;
        
        value = resolveMaxRangeLimit(minValue, value, compare);
        
        resolveMaxValue(value, compare);
        toggleMaxEditingMode();
      }
    }
    
    function onMinInputKeyUp(event) {
      var value = event.target.value;
      
      if (validateInput(value)) {
        value = valueParser(value);
        
        var maxValue = valueParser(range.max);
        var compare = value >= maxValue;
        
        value = resolveMinRangeLimit(value, maxValue, compare);
        
        resolveMinValue(value, compare);
        toggleMinEditingMode();
      }
    }
    
    function onJoinedFocusOut(event) {
      if (event.target !== joinedViewerMinInput && event.target !== joinedViewerMaxInput) {
        toggleJoinedEditingMode();
      }
    }
    
    function onJoinedInputKeyUp() {
      var minValue = joinedViewerMinInput.value;
      var maxValue = joinedViewerMaxInput.value;
      
      if (isNotNull(minValue) && isNotEmpty(minValue) && isNotNull(maxValue) && isNotEmpty(maxValue)) {
        if (validateInput(minValue) && validateInput(maxValue)) {
          minValue = valueParser(minValue);
          maxValue = valueParser(maxValue);
          
          var rangeMaxValue = valueParser(range.max);
          
          var compare = minValue >= maxValue;
          
          minValue = resolveMinRangeLimit(minValue, maxValue, compare);
          maxValue = resolveMaxRangeLimit(minValue, maxValue, compare);
          
          if (minValue > rangeMaxValue) {
            resolveMaxValue(maxValue, compare);
            resolveMinValue(minValue, compare);
          } else {
            resolveMinValue(minValue, compare);
            resolveMaxValue(maxValue, compare);
          }
        }
      }
    }
    
    function onWindowMouseUp() {
      rootElement.removeEventListener(MOUSE_MOVE, onMinSliderMouseMove, true);
      rootElement.removeEventListener(MOUSE_MOVE, onMaxSliderMouseMove, true);
    }
    
    function onWindowResize() {
      var minValue = valueParser(range.min);
      var maxValue = valueParser(range.max);
      
      var compare = minValue >= maxValue;
      
      resolveMaxValue(maxValue, compare);
      resolveMinValue(minValue, compare);
    }
    
    function resolveMaxRangeLimit(minValue, maxValue, compare) {
      if (maxValue > maxRange) {
        if (!limitToRange) {
          maxRange = maxValue;
          setupLabels();
          resolveMinValue(minValue, compare);
        } else {
          maxValue = maxRange;
        }
      }
      
      return maxValue;
    }
    
    function resolveMaxSliderMouseMove(pointerX, compare) {
      var rangeContainerRect = getRangeContainerRect();
      
      var maxSliderX = getPointerXOnRangeContainer(pointerX, rangeContainerRect);
      
      if (compare && compareToMinSlider(maxSliderX, rangeContainerRect)) {
        maxSlider.style.zIndex = '4';
        minSlider.style.zIndex = '3';
        maxSlider.style.left = minSlider.style.left;
        range.max = range.min;
      } else {
        var rangeContainerWidth = rangeContainerRect.width;
        var calcMaxSliderX = maxSliderX - sliderRadius;
        
        var maxSliderPct = getPercentage(calcMaxSliderX, rangeContainerWidth);
        var maxValuePct = getPercentage(calcMaxSliderX, rangeContainerWidth - sliderWidth);
        
        var maxRangeValue = getRangeValue(maxValuePct);
        
        maxSlider.style.left = [maxSliderPct, '%'].join('');
        range.max = valueFormatter(maxRangeValue);
      }
      updateRangeHighlight();
      updateViewers(MAX);
      resolvedDispatchRangeChange();
    }
    
    function resolveMaxValue(value, compare) {
      var rangeContainerRect = getRangeContainerRect();
      
      var maxSliderPct = getRangePercentage(value);
      
      var maxSliderX = getXFromPercentage(maxSliderPct, (rangeContainerRect.width - sliderWidth));
      
      maxSliderX += rangeContainerRect.left + sliderRadius;
      
      resolveMaxSliderMouseMove(maxSliderX, compare);
    }
    
    function resolveMaxViewerPosition() {
      var maxViewerClientRect = getClientRect(maxViewer);
      
      var rangeSliderContainer = getRangeContainerRect();
      
      var maxViewerWidthPct = getPercentage(maxViewerClientRect.width / 2, rangeSliderContainer.width);
      var sliderRadiusPct = getPercentage(sliderRadius, rangeSliderContainer.width);
      
      var maxSliderPct = getMaxSliderXPct();
      
      var maxViewerXPct = (maxSliderPct - maxViewerWidthPct) + sliderRadiusPct;
      
      if (maxSliderPct < maxViewerWidthPct) {
        maxViewerXPct = 0;
      }
      
      var maxViewerPct = 100 - (maxViewerWidthPct * 2);
      
      if (maxViewerXPct > 0) {
        if (maxSliderPct > maxViewerPct) {
          maxViewerXPct = maxViewerPct;
        }
      }
      
      maxViewer.style.left = [maxViewerXPct, '%'].join('');
    }
    
    function resolveMinRangeLimit(minValue, maxValue, compare) {
      if (minValue < minRange) {
        if (minValue <= 0) {
          minValue = 0
        }
        
        if (!limitToRange) {
          minRange = minValue;
          setupLabels();
          resolveMaxValue(maxValue, compare);
        } else {
          minValue = minRange;
        }
      }
      
      return minValue;
    }
    
    function resolveMinSliderMouseMove(pointerX, compare) {
      var rangeContainerRect = getRangeContainerRect();
      
      var minSliderX = getPointerXOnRangeContainer(pointerX, rangeContainerRect);
      
      if (compare && compareToMaxSlider(minSliderX, rangeContainerRect)) {
        minSlider.style.zIndex = '4';
        maxSlider.style.zIndex = '3';
        minSlider.style.left = maxSlider.style.left;
        range.min = range.max;
      } else {
        var rangeContainerWidth = rangeContainerRect.width;
        var calcMinSliderX = minSliderX - sliderRadius;
        
        var minSliderPct = getPercentage(calcMinSliderX, rangeContainerWidth);
        var minValuePct = getPercentage(calcMinSliderX, rangeContainerWidth);
        
        var minRangeValue = getRangeValue(minValuePct);
        
        minSlider.style.left = [minSliderPct, '%'].join('');
        range.min = valueFormatter(minRangeValue);
      }
      
      updateRangeHighlight();
      updateViewers(MIN);
      resolvedDispatchRangeChange();
    }
    
    function resolveMinValue(value, compare) {
      var rangeContainerRect = getRangeContainerRect();
      
      var minSliderPct = getRangePercentage(value);
      var sliderRadiusPct = getPercentage(sliderRadius, rangeContainerRect.width);
      
      var minSliderX = getXFromPercentage(minSliderPct + sliderRadiusPct, rangeContainerRect.width);
      
      minSliderX += rangeContainerRect.left;
      
      resolveMinSliderMouseMove(minSliderX, compare);
    }
    
    function resolveMinViewerPosition() {
      var minViewerClientRect = getClientRect(minViewer);
      
      var rangeSliderContainer = getRangeContainerRect();
      
      var minViewerWidthPct = getPercentage(minViewerClientRect.width / 2, rangeSliderContainer.width);
      var sliderRadiusPct = getPercentage(sliderRadius, rangeSliderContainer.width);
      
      var minSliderPct = getMinSliderXPct();
      
      var minViewerXPct = (minSliderPct - minViewerWidthPct) + sliderRadiusPct;
      
      if (minSliderPct < minViewerWidthPct) {
        minViewerXPct = 0;
      }
      
      var maxViewerPct = 100 - (minViewerWidthPct * 2);
      
      if (minViewerXPct > 0) {
        if (minSliderPct > maxViewerPct) {
          minViewerXPct = maxViewerPct;
        }
      }
      
      minViewer.style.left = [minViewerXPct, '%'].join('');
    }
    
    function resolveJoinedViewer() {
      if (editingMinValue || editingMaxValue) {
        return;
      }
      var minViewerClientRect = getClientRect(minViewer);
      var maxViewerClientRect = getClientRect(maxViewer);
      
      var minViewerFullWidth = minViewerClientRect.left + minViewerClientRect.width;
      
      var minLabel = [labelPrefix, range.min].join('');
      var maxLabel = [labelPrefix, range.max].join('');
      var rangeLabel = [minLabel, maxLabel].join(' - ');
      
      if (minViewerFullWidth > maxViewerClientRect.left) {
        minViewer.style.visibility = HIDDEN;
        maxViewer.style.visibility = HIDDEN;
        joinedViewer.style.visibility = VISIBLE;
        viewJoinedValue.innerHTML = rangeLabel;
        if (valueParser(range.min) === valueParser(range.max)) {
          viewJoinedValue.innerHTML = minLabel;
        }
        editingJoinedValue = false;
        setupJoinedViewerViewEvents();
        resolveJoinedViewerPosition();
      } else {
        joinedViewer.style.visibility = HIDDEN;
        minViewer.style.visibility = VISIBLE;
        maxViewer.style.visibility = VISIBLE;
      }
    }
    
    function resolveJoinedViewerPosition() {
      var joinedViewerClientRect = getClientRect(joinedViewer);
      var rangeSliderContainer = getRangeContainerRect();
      
      var joinedViewerWidthPct = getPercentage(joinedViewerClientRect.width / 2, rangeSliderContainer.width);
      var sliderRadiusPct = getPercentage(sliderRadius, rangeSliderContainer.width);
      
      var minSliderPct = getMinSliderXPct();
      var maxSliderPct = getMaxSliderXPct();
      
      var middleSlidersPct = minSliderPct + ((maxSliderPct - minSliderPct) / 2) + sliderRadiusPct;
      
      var joinedViewerXPct = (middleSlidersPct - joinedViewerWidthPct);
      
      if (middleSlidersPct < joinedViewerWidthPct) {
        joinedViewerXPct = 0;
      }
      
      var maxViewerPct = 100 - (joinedViewerWidthPct * 2);
      
      if (joinedViewerXPct > 0) {
        if (middleSlidersPct > maxViewerPct) {
          joinedViewerXPct = maxViewerPct;
        }
      }
      
      joinedViewer.style.left = [joinedViewerXPct, '%'].join('');
      updateRangeHighlight();
    }
    
    function setRange(event) {
      var minValue = event.detail.min;
      var maxValue = event.detail.max;
      
      joinedViewerMinInput.value = valueFormatter(minValue);
      joinedViewerMaxInput.value = valueFormatter(maxValue);
      
      onJoinedInputKeyUp();
    }
    
    function setupColors() {
      if (isNotNull(colors)) {
        if (isNotNull(colors.sliderBgColor)) {
          minSlider.style.backgroundColor = colors.sliderBgColor;
          maxSlider.style.backgroundColor = colors.sliderBgColor;
        }
        if (isNotNull(colors.sliderBoxShadowColor)) {
          minSlider.style.boxShadow = ['0px 0px 5px ', colors.sliderBoxShadowColor, ' inset'].join('');
          maxSlider.style.boxShadow = ['0px 0px 5px ', colors.sliderBoxShadowColor, ' inset'].join('');
        }
        if (isNotNull(colors.highlightBgColor)) {
          rangeHighlight.style.backgroundColor = colors.highlightBgColor;
        }
        if (isNotNull(colors.highlightBoxShadowColor)) {
          rangeHighlight.style.boxShadow = ['0px 0px 5px ', colors.highlightBoxShadowColor, ' inset'].join('');
        }
        if (isNotNull(colors.viewerBgColor)) {
          minViewer.style.backgroundColor = colors.viewerBgColor;
          maxViewer.style.backgroundColor = colors.viewerBgColor;
          joinedViewer.style.backgroundColor = colors.viewerBgColor;
        }
        if (isNotNull(colors.viewerColor)) {
          minViewer.style.color = colors.viewerColor;
          maxViewer.style.color = colors.viewerColor;
          joinedViewer.style.color = colors.viewerColor;
          
          minViewerInput.style.color = colors.viewerColor;
          maxViewerInput.style.color = colors.viewerColor;
          joinedViewerMinInput.style.color = colors.viewerColor;
          joinedViewerMaxInput.style.color = colors.viewerColor;
        }
        if (isNotNull(colors.viewerInputBottomBorder)) {
          minViewerInput.style.borderBottomColor = colors.viewerInputBottomBorder;
          maxViewerInput.style.borderBottomColor = colors.viewerInputBottomBorder;
          joinedViewerMinInput.style.borderBottomColor = colors.viewerInputBottomBorder;
          joinedViewerMaxInput.style.borderBottomColor = colors.viewerInputBottomBorder;
        }
      }
    }
    
    function setupConfiguration() {
      minRange = config.min;
      maxRange = config.max;
      sliderWidth = getClientRect(minSlider).width;
      sliderRadius = sliderWidth / 2;
      
      if (isNotNull(config.colors)) {
        colors = config.colors;
      }
      if (isNotNull(config.debounceTime) && isNumber(config.debounceTime)) {
        debounceTime = config.debounceTime;
      }
      if (isNotNull(config.inputEnter) && isBoolean(config.inputEnter)) {
        inputEnter = config.inputEnter;
      }
      if (isNotNull(config.limitToRange) && isBoolean(config.limitToRange)) {
        limitToRange = config.limitToRange;
      }
      if (isNotNull(config.valueFormatter) && isFunction(config.valueFormatter)) {
        valueFormatter = config.valueFormatter;
      }
      if (isNotNull(config.valueParser) && isFunction(config.valueFormatter)) {
        valueParser = config.valueParser;
      }
      if (isNotNull(config.labelPrefix) && isString(config.labelPrefix)) {
        labelPrefix = config.labelPrefix;
      }
      
      var rangeMinValue = minRange;
      var rangeMaxValue = maxRange;
      
      if (
        isNotNull(config.range) && isObject(config.range) &&
        isNotNull(config.range.min) && isNumber(config.range.min) &&
        isNotNull(config.range.max) && isNumber(config.range.max)
      ) {
        rangeMinValue = config.range.min;
        rangeMaxValue = config.range.max;
      }
      
      range = {
        min: valueFormatter(rangeMinValue),
        max: valueFormatter(rangeMaxValue),
      };
    }
    
    
    function setupDOM() {
      var component = document.createElement(DIV);
      component.setAttribute(CLASS, 'currency-range-slider-component');
      rootElement.appendChild(component);
      
      var labelContainer = document.createElement(DIV);
      labelContainer.setAttribute(CLASS, 'currency-range-slider-label-container');
      component.appendChild(labelContainer);
      
      var minLabel = document.createElement(SPAN);
      minLabel.setAttribute(CLASS, 'currency-range-slider-label currency-range-slider-label-min');
      labelContainer.appendChild(minLabel);
      
      var maxLabel = document.createElement(SPAN);
      maxLabel.setAttribute(CLASS, 'currency-range-slider-label currency-range-slider-label-max');
      labelContainer.appendChild(maxLabel);
      
      var sliderContainer = document.createElement(DIV);
      sliderContainer.setAttribute(CLASS, 'currency-range-slider-container');
      component.appendChild(sliderContainer);
      
      var rangeHighlight = document.createElement(SPAN);
      rangeHighlight.setAttribute(CLASS, 'currency-range-slider-highlight');
      sliderContainer.appendChild(rangeHighlight);
      
      var minSlider = document.createElement(SPAN);
      minSlider.setAttribute(CLASS, 'currency-range-slider currency-range-slider-min');
      sliderContainer.appendChild(minSlider);
      
      var maxSlider = document.createElement(SPAN);
      maxSlider.setAttribute(CLASS, 'currency-range-slider currency-range-slider-max');
      sliderContainer.appendChild(maxSlider);
      
      var viewerContainer = document.createElement(DIV);
      viewerContainer.setAttribute(CLASS, 'currency-range-slider-viewer-container');
      component.appendChild(viewerContainer);
      
      var minViewer = document.createElement(DIV);
      minViewer.setAttribute(CLASS, 'currency-range-slider-viewer currency-range-slider-viewer-min');
      viewerContainer.appendChild(minViewer);
      
      var minViewerView = document.createElement(SPAN);
      minViewerView.setAttribute(CLASS, 'currency-range-slider-viewer-view');
      minViewer.appendChild(minViewerView);
      
      var minViewerInput = document.createElement(INPUT);
      minViewerInput.setAttribute(TYPE, 'text');
      minViewerInput.setAttribute(CLASS, 'currency-range-slider-viewer-input');
      minViewer.appendChild(minViewerInput);
      
      var joinedViewer = document.createElement(DIV);
      joinedViewer.setAttribute(CLASS, 'currency-range-slider-viewer currency-range-slider-viewer-joined');
      viewerContainer.appendChild(joinedViewer);
      
      var joinedViewerView = document.createElement(SPAN);
      joinedViewerView.setAttribute(CLASS, 'currency-range-slider-viewer-view');
      joinedViewer.appendChild(joinedViewerView);
      
      var joinedViewerInputs = document.createElement(SPAN);
      joinedViewerInputs.setAttribute(CLASS, 'currency-range-slider-viewer-inputs');
      joinedViewer.appendChild(joinedViewerInputs);
      
      var joinedViewerMinInput = document.createElement(INPUT);
      joinedViewerMinInput.setAttribute(TYPE, 'text');
      joinedViewerMinInput.setAttribute(CLASS, 'currency-range-slider-viewer-input currency-range-slider-viewer-input-min');
      joinedViewerInputs.appendChild(joinedViewerMinInput);
      
      joinedViewerInputs.appendChild(document.createTextNode(' - '));
      
      var joinedViewerMaxInput = document.createElement(INPUT);
      joinedViewerMaxInput.setAttribute(TYPE, 'text');
      joinedViewerMaxInput.setAttribute(CLASS, 'currency-range-slider-viewer-input currency-range-slider-viewer-input-max');
      joinedViewerInputs.appendChild(joinedViewerMaxInput);
      
      var maxViewer = document.createElement(DIV);
      maxViewer.setAttribute(CLASS, 'currency-range-slider-viewer currency-range-slider-viewer-max');
      viewerContainer.appendChild(maxViewer);
      
      var maxViewerView = document.createElement(SPAN);
      maxViewerView.setAttribute(CLASS, 'currency-range-slider-viewer-view');
      maxViewer.appendChild(maxViewerView);
      
      var maxViewerInput = document.createElement(INPUT);
      maxViewerInput.setAttribute(TYPE, 'text');
      maxViewerInput.setAttribute(CLASS, 'currency-range-slider-viewer-input');
      maxViewer.appendChild(maxViewerInput);
    }
    
    function setupDOMRefs() {
      labelMin = rootElement.querySelector('.currency-range-slider-label-container .currency-range-slider-label-min');
      labelMax = rootElement.querySelector('.currency-range-slider-label-container .currency-range-slider-label-max');
      
      rangeContainer = rootElement.querySelector('.currency-range-slider-container');
      rangeHighlight = rootElement.querySelector('.currency-range-slider-container .currency-range-slider-highlight');
      
      minSlider = rootElement.querySelector('.currency-range-slider-container .currency-range-slider-min');
      maxSlider = rootElement.querySelector('.currency-range-slider-container .currency-range-slider-max');
      
      minViewer = rootElement.querySelector('.currency-range-slider-viewer-container .currency-range-slider-viewer-min');
      minViewerView = rootElement.querySelector('.currency-range-slider-viewer-container .currency-range-slider-viewer-min .currency-range-slider-viewer-view');
      minViewerInput = rootElement.querySelector('.currency-range-slider-viewer-container .currency-range-slider-viewer-min .currency-range-slider-viewer-input');
      
      joinedViewer = rootElement.querySelector('.currency-range-slider-viewer-container .currency-range-slider-viewer-joined');
      joinedViewerInputs = rootElement.querySelector('.currency-range-slider-viewer-container .currency-range-slider-viewer-joined .currency-range-slider-viewer-inputs');
      viewJoinedValue = rootElement.querySelector('.currency-range-slider-viewer-container .currency-range-slider-viewer-joined .currency-range-slider-viewer-view');
      joinedViewerMinInput = rootElement.querySelector('.currency-range-slider-viewer-container .currency-range-slider-viewer-joined .currency-range-slider-viewer-input-min');
      joinedViewerMaxInput = rootElement.querySelector('.currency-range-slider-viewer-container .currency-range-slider-viewer-joined .currency-range-slider-viewer-input-max');
      
      maxViewer = rootElement.querySelector('.currency-range-slider-viewer-container .currency-range-slider-viewer-max');
      maxViewerView = rootElement.querySelector('.currency-range-slider-viewer-container .currency-range-slider-viewer-max .currency-range-slider-viewer-view');
      maxViewerInput = rootElement.querySelector('.currency-range-slider-viewer-container .currency-range-slider-viewer-max .currency-range-slider-viewer-input');
    }
    
    function setupInputEvents() {
      rootElement.addEventListener(DESTROY, dispatchDestroy, true);
      rootElement.addEventListener(SET_RANGE, setRange, true)
    }
    
    function setupLabels() {
      labelMin.innerHTML = [labelPrefix, valueFormatter(minRange)].join('');
      labelMax.innerHTML = [labelPrefix, valueFormatter(maxRange)].join('');
    }
    
    function setupMaxSliderMouseDownEvent() {
      maxSlider.addEventListener(MOUSE_DOWN, onMaxSliderMouseDown, true);
    }
    
    function setupMinSliderMouseDownEvent() {
      minSlider.addEventListener(MOUSE_DOWN, onMinSliderMouseDown, true);
    }
    
    function setupMobileSupport() {
      isMobile = ON_TOUCH_START in document.documentElement;
      
      if (isMobile) {
        MOUSE_DOWN = TOUCH_START;
        MOUSE_MOVE = TOUCH_MOVE;
        MOUSE_UP = TOUCH_END;
      }
    }
    
    function setupOutputEvents() {
      setupWindowMouseUpEvent();
      setupWindowResizeEvent();
      setupMinSliderMouseDownEvent();
      setupMaxSliderMouseDownEvent();
      setupViewerViewEvents(MIN);
      setupViewerViewEvents(MAX);
    }
    
    function setupResolvedKeyUpEvents() {
      if (inputEnter) {
        resolvedOnMinInputKeyUp = debounceUntilEnter(onMinInputKeyUp);
        resolvedOnMaxInputKeyUp = debounceUntilEnter(onMaxInputKeyUp);
        resolvedOnJoinedInputKeyUp = debounceUntilEnter(onJoinedInputKeyUp);
      } else {
        resolvedOnMinInputKeyUp = debounce(onMinInputKeyUp, debounceTime);
        resolvedOnMaxInputKeyUp = debounce(onMaxInputKeyUp, debounceTime);
        resolvedOnJoinedInputKeyUp = debounce(onJoinedInputKeyUp, debounceTime);
      }
    }
    
    function setupRootelement() {
      if (isString(elementId)) {
        rootElement = document.getElementById(elementId);
      } else if (isObject(elementId) && elementId instanceof HTMLElement) {
        rootElement = elementId;
      }
      
      if (isNull(rootElement)) {
        throw Error('You must provide a valid HTMLElement\'s id or HTMLElement object');
      }
    }
    
    function setupSliderPositions() {
      resolveMaxValue(valueParser(range.max), false);
      resolveMinValue(valueParser(range.min), false);
    }
    
    function setupJoinedViewerViewEvents() {
      joinedViewerInputs.style.display = NONE;
      joinedViewerMinInput.value = '';
      joinedViewerMaxInput.value = '';
      
      viewJoinedValue.style.display = INLINE_BLOCK;
      window.removeEventListener(CLICK, onJoinedFocusOut, true);
      joinedViewerMinInput.removeEventListener(KEY_UP, resolvedOnJoinedInputKeyUp, true);
      
      joinedViewerMaxInput.removeEventListener(KEY_UP, resolvedOnJoinedInputKeyUp, true);
      
      viewJoinedValue.addEventListener(CLICK, toggleJoinedEditingMode, true);
    }
    
    function setupJoinedViewerInputEvents() {
      viewJoinedValue.style.display = NONE;
      joinedViewerInputs.style.display = INLINE_BLOCK;
      
      viewJoinedValue.removeEventListener(CLICK, toggleJoinedEditingMode, true);
      
      window.addEventListener(CLICK, onJoinedFocusOut, true);
      joinedViewerMinInput.focus();
      joinedViewerMinInput.addEventListener(KEY_UP, resolvedOnJoinedInputKeyUp, true);
      joinedViewerMaxInput.addEventListener(KEY_UP, resolvedOnJoinedInputKeyUp, true);
    }
    
    function setupViewerViewEvents(type) {
      if (type === MIN) {
        minViewerInput.style.display = NONE;
        minViewerInput.value = '';
        minViewerView.style.display = INLINE_BLOCK;
        minViewerInput.removeEventListener(KEY_UP, resolvedOnMinInputKeyUp, true);
        minViewerInput.removeEventListener(FOCUS_OUT, toggleMinEditingMode, true);
        minViewerView.addEventListener(CLICK, toggleMinEditingMode, true);
      } else {
        maxViewerInput.style.display = NONE;
        maxViewerInput.value = '';
        maxViewerView.style.display = INLINE_BLOCK;
        maxViewerInput.removeEventListener(KEY_UP, resolvedOnMaxInputKeyUp, true);
        maxViewerInput.removeEventListener(FOCUS_OUT, toggleMaxEditingMode, true);
        maxViewerView.addEventListener(CLICK, toggleMaxEditingMode, true);
      }
    }
    
    function setupViewerInputEvents(type) {
      if (type === MIN) {
        minViewerView.style.display = NONE;
        minViewerInput.style.display = INLINE_BLOCK;
        minViewerView.removeEventListener(CLICK, toggleMinEditingMode, true);
        minViewerInput.focus();
        minViewerInput.addEventListener(FOCUS_OUT, toggleMinEditingMode, true);
        minViewerInput.addEventListener(KEY_UP, resolvedOnMinInputKeyUp, true);
      } else {
        maxViewerView.style.display = NONE;
        maxViewerInput.style.display = INLINE_BLOCK;
        maxViewerView.removeEventListener(CLICK, toggleMaxEditingMode, true);
        maxViewerInput.focus();
        maxViewerInput.addEventListener(FOCUS_OUT, toggleMaxEditingMode, true);
        maxViewerInput.addEventListener(KEY_UP, resolvedOnMaxInputKeyUp, true);
      }
    }
    
    function setupWindowMouseUpEvent() {
      window.addEventListener(MOUSE_UP, onWindowMouseUp, true);
    }
    
    function setupWindowResizeEvent() {
      window.addEventListener(RESIZE, onWindowResize, true);
    }
    
    function toggleMaxEditingMode() {
      if (editingMaxValue) {
        setupViewerViewEvents(MAX);
      } else {
        setupViewerInputEvents(MAX);
      }
      editingMaxValue = !editingMaxValue;
      
      updateRangeHighlight();
      updateViewers(MAX);
    }
    
    function toggleMinEditingMode() {
      if (editingMinValue) {
        setupViewerViewEvents(MIN);
      } else {
        setupViewerInputEvents(MIN);
      }
      editingMinValue = !editingMinValue;
      
      updateRangeHighlight();
      updateViewers(MIN);
    }
    
    function toggleJoinedEditingMode() {
      if (editingJoinedValue) {
        setupJoinedViewerViewEvents();
      } else {
        setupJoinedViewerInputEvents();
      }
      
      editingJoinedValue = !editingJoinedValue;
      
      resolveJoinedViewerPosition();
    }
    
    function updateRangeHighlight() {
      var minSliderPct = getMinSliderXPct();
      var maxSliderPct = getMaxSliderXPct();
      var sliderRadiusPct = getPercentage(sliderRadius, getRangeContainerRect().width);
      
      var left = minSliderPct + sliderRadiusPct;
      var width = maxSliderPct - minSliderPct;
      
      if (width < 0) {
        width = 0;
      }
      
      var highlightStyle = {
        left: [left, '%'].join(''),
        width: [width, '%'].join('')
      };
      
      rangeHighlight.style.left = highlightStyle.left;
      rangeHighlight.style.width = highlightStyle.width;
    }
    
    function updateViewers(type) {
      var minLabel = [labelPrefix, range.min].join('');
      var maxLabel = [labelPrefix, range.max].join('');
      minViewerView.innerHTML = minLabel;
      maxViewerView.innerHTML = maxLabel;
      if (type === MIN) {
        resolveMinViewerPosition();
      } else {
        resolveMaxViewerPosition();
      }
      resolveJoinedViewer();
    }
    
    function validateInput(inputValue) {
      if (isNotNull(inputValue)) {
        if (isNumber(inputValue)) {
          return true;
        }
        return isNotEmpty(inputValue) && !isNaN(valueParser(inputValue));
      }
      
      return false;
    }
    
    function debounce(fn, wait) {
      var timeout;
      return function () {
        var args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function () {
          fn.apply({}, args);
        }, wait);
      };
    }
    
    function debounceUntilEnter(fn) {
      return function (event) {
        if (event.keyCode === ENTER_KEY_CODE) {
          fn.apply({}, arguments);
        }
      }
    }
    
    function getClientRect(element) {
      return element.getBoundingClientRect();
    }
    
    function getPercentage(value, total) {
      return (100 * value) / total;
    }
    
    function getXFromPercentage(pct, total) {
      return (total * pct) / 100;
    }
    
    function isBoolean(param) {
      return typeof param === 'boolean';
    }
    
    function isFunction(param) {
      return typeof param === 'function';
    }
    
    function isNotEmpty(param) {
      return param.length > 0;
    }
    
    function isNotNull(param) {
      return !isNull(param);
    }
    
    function isNull(param) {
      return param == null;
    }
    
    function isNumber(param) {
      return typeof param === 'number';
    }
    
    function isObject(param) {
      return typeof param === 'object';
    }
    
    function isString(param) {
      return typeof param === 'string';
    }
  }
  
})();
