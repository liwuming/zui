/* ========================================================================
 * ZUI: flowChart.js
 * http://zui.sexy
 * ========================================================================
 * Copyright (c) 2017-2019 cnezsoft.com; Licensed MIT
 * ======================================================================== */
(function($, undefined, window, document) {
    'use strict';

    var selectText = function($e) {
        var doc = document;
        var element = $e[0],
            range;
        if(doc.body.createTextRange) {
            range = document.body.createTextRange();
            range.moveToElementText(element);
            range.select();
        } else if(window.getSelection) {
            var selection = window.getSelection();
            range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };

    /**
     * Get distance of two points
     * @param {{left: number, top: number}} point1
     * @param {{left: number, top: number}} point2
     * @return {number}
     */
    var distanceOfTwoPoints = function(point1, point2) {
        var left = point1.left - point2.left;
        var top = point1.top - point2.top;
        return Math.sqrt(left * left + top * top);
    };

    /**
     * Add two points
     * @param {{left: number, top: number}} point1
     * @param {{left: number, top: number}} point2
     * @return {number}
     */
    var addTwoPoints = function(point1, point2) {
        return {
            left: point1.left + point2.left,
            top: point1.top + point2.top,
        };
    };

    var ifUndefinedThen = function(value, thenValue1, thenValue2, thenValue3) {
        if (value !== undefined) {
            return value;
        }
        if (thenValue1 !== undefined) {
            return thenValue1;
        }
        if (thenValue2 !== undefined) {
            return thenValue2;
        }
        return thenValue3;
    };

    var ifUndefinedOrNullThen = function(value, thenValue1, thenValue2, thenValue3) {
        if (value !== undefined && value !== null) {
            return value;
        }
        if (thenValue1 !== undefined && thenValue1 !== null) {
            return thenValue1;
        }
        if (thenValue2 !== undefined && thenValue2 !== null) {
            return thenValue2;
        }
        return thenValue3;
    };

    var convertCssToSvgStyle = function(style) {
        var svgStyle = $.extend({}, style);
        if (svgStyle.background) {
            svgStyle.fill = svgStyle.background;
            delete svgStyle.background;
        }
        if (svgStyle.backgroundColor) {
            svgStyle.fill = svgStyle.backgroundColor;
            delete svgStyle.backgroundColor;
        }
        if (svgStyle.borderWidth) {
            svgStyle['stroke-width'] = svgStyle.borderWidth;
            delete svgStyle.borderWidth;
        }
        if (svgStyle.borderColor) {
            svgStyle.stroke = svgStyle.borderColor;
            delete svgStyle.borderColor;
        }
        return svgStyle;
    };

    var createSVGElement = function(type, attrs) {
        if (typeof type === 'object') {
            attrs = type;
            type = 'svg';
        } else if (!type) {
            type = 'svg';
        }
        var svg = document.createElementNS('http://www.w3.org/2000/svg', type);
        if (attrs) {
            $.each(attrs, function(attrName, attrValue) {
                if (attrValue !== undefined && attrValue !== null) {
                    svg.setAttribute(attrName, attrValue);
                }
            });
        }
        return svg;
    };

    var updateSVGElement = function(svg, attrs) {
        $.each(attrs, function(attrName, attrValue) {
            if (attrValue !== undefined && attrValue !== null) {
                svg.setAttribute(attrName, attrValue);
            } else {
                svg.removeAttribute(attrName);
            }
        });
    };

    // model name
    var NAME = 'zui.flowChart';
    var idSeed = 1;
    var SIDES = {top: 'top', right: 'right', bottom: 'bottom', left: 'left'};

    var basicElementProps = {
        id: function(value) {
            if (value !== undefined) {
                if (value.indexOf(':') > -1) {
                    throw new Error('FlowChart: Do not allow ":" in element id "' + value + '".');
                }
                if (value.indexOf('.') > -1) {
                    throw new Error('FlowChart: Do not allow "." in element id "' + value + '".');
                }
                return value;
            }
            return $.zui.uuid();
        },
        type: function(_, elementType) {return elementType.name},
        text: function(value, elementType, elementData) {
            if (value === null) {
                value = typeof elementType.text === 'function' ? elementType.text(elementType, elementData) : elementType.text;
            }
            return value === undefined || value === null ? '' : String(value);
        },
        order: function(value, elementType) {
            if (value === undefined) {
                return (elementType.isRelation ? 10000 : 0) + idSeed++;
            }
            return value;
        },
        data: function(value, elementType, elementData) {
            var data = $.extend({}, value);
            $.each(elementData, function(propName, propVal) {
                if (!elementType.props[propName]) {
                    data[propName] = propVal;
                }
            });
            return data;
        },

        style: 'object',
        textStyle: 'object',
        className: 'string',
        visible: false,
        $ele: false,
        $text: false,
        bounds: false,
        elementType: false,
        isRelation: false,
        isNode: false,
        flowChart: false,
    };

    var basicRelationProps = $.extend({
        lineStyle: 'string',
        lineWidth: 'int',
        lineColor: 'string',
        lineShape: 'string',
        arrowSize: 'int',
        position: function(value) {
            if (value && typeof value === 'object') {
                if (value.shape && typeof value.shape === 'object') {
                    return $.extend({custom: true}, value)
                }
            }
            return {};
        },
        hideArrow: function(value, _, elementData) {
            if (value === undefined) {
                value = !elementData.arrowSize;
            }
            return !!value;
        },
        from: function(value) {
            if (value) {
                value = value.split('.')[0];
            }
            return value;
        },
        to: function(value) {
            if (value) {
                value = value.split('.')[0];
            }
            return value;
        },
        fromPort: function(value, _, elementData) {
            if ((value === undefined || value === null || !value.length) && elementData.from) {
                value = elementData.from.split('.')[1];
            }
            return value;
        },
        toPort: function(value, _, elementData) {
            if ((value === undefined || value === null || !value.length) && elementData.to) {
                value = elementData.to.split('.')[1];
            }
            return value;
        },
        fromIndex: false,
        toIndex: false,
        fromNode: false,
        toNode: false,
        beginSideRels: false,
        endSideRels: false,
    }, basicElementProps);
    var basicNodeProps = $.extend({
        borderStyle: 'string',
        borderWidth: 'int',
        borderColor: 'string',
        shapeStyle: 'object',
        position: function(value) {
            if (value && typeof value === 'object') {
                ['left', 'top', 'centerLeft', 'centerTop'].forEach(function(name) {
                    if (typeof value[name] === 'string') {
                        var val = Number.parseInt(value[name]);
                        if (!Number.isNaN(val)) {
                            value[name] = val;
                        }
                    }
                });
                if ((typeof value.left === 'number' && typeof value.top === 'number') || (typeof value.centerLeft === 'number' && typeof value.centerTop === 'number') || (SIDES[value.direction] && typeof value.from === 'string')) {
                    return $.extend({custom: true}, value)
                }
            }
            return {};
        },
        hideArrowToSelf: 'bool',
        width: 'int',
        height: 'int',
        maxWidth: 'int',
        minWidth: 'int',
        siblingsIndex: false,
        fromRels: false,
        toRels: false,
        children: false,
        parents: false,
    }, basicElementProps);

    var onePortEachSide = {
        top: 1,
        bottom: 1,
        left: 1,
        right: 1,
    };

    var threePortsEachSide = {
        top: 3,
        bottom: 3,
        left: 1,
        right: 1,
    };

    // 基础元素类型
    var basicElementTypes = {
        relation: {
            props: basicRelationProps,
        },
        rectangle: {
            shape: 'rectangle',
            style: {borderRadius: '2px', borderStyle: 'solid', borderWidth: 1, borderColor: '#333'},
            textStyle: {lineHeight: '20px', minHeight: 38, padding: '9px 10px'},
            props: basicNodeProps,
            ports: threePortsEachSide
        },
        box: {
            shape: 'box',
            style: {borderRadius: '20px', borderStyle: 'solid', borderWidth: 1, borderColor: '#333'},
            textStyle: {lineHeight: '20px', minHeight: 38, padding: '9px 10px'},
            props: basicNodeProps,
            ports: threePortsEachSide
        },
        diamond: {
            shape: 'diamond',
            style: {borderWidth: 0},
            textStyle: {lineHeight: '20px', minHeight: 38, padding: '9px 20px'},
            shapeStyle: {fill: '#fff', strokeWidth: 1, stroke: '#333'},
            props: basicNodeProps,
            ports: onePortEachSide,
        },
        circle: {
            shape: 'circle',
            minWidth: 40,
            textStyle: {lineHeight: '20px', minHeight: 38, padding: '9px 10px'},
            style: {borderRadius: '50%', borderStyle: 'solid', borderWidth: 1, borderColor: '#333', minWidth: 40},
            props: basicNodeProps,
            ports: onePortEachSide,
        },
        connection: {
            minWidth: 0,
            style: {padding: 2},
            textStyle: {lineHeight: 1, minHeight: 12},
            shape: 'connection',
            hideArrowToSelf: true,
            props: basicNodeProps,
            quickAdd: false,
            ports: onePortEachSide,
        },
        dot: {
            shape: 'dot',
            width: 16,
            height: 16,
            shapeStyle: {borderRadius: '50%', borderStyle: 'solid', borderWidth: 1, borderColor: '#333', minWidth: 0, minHeight: 0, maxWidth: 'none', maxHeight: 'none', overflow: 'visible'},
            props: $.extend({
                textPosition: 'string'
            }, basicNodeProps),
            ports: onePortEachSide,
        }
    };

    var supportElementTypes = {
        relation: {type: 'relation'},
        action: {type: 'rectangle'},
        start: {type: 'box', beginType: true},
        stop: {type: 'box', endType: true},
        judge: {type: 'diamond'},
        result: {type: 'circle'},
        connection: {type: 'connection'},
        point: {type: 'dot'},
    };

    /**
     * Create a FlowChartElementPort
     * @param {Object|string|number} portData
     * @param {string} side
     * @param {number} index
     */
    var FlowChartElementPort = function(portData, side, index) {
        if (typeof portData === 'number') {
            portData = {space: portData};
        } else if (typeof portData === 'string') {
            portData = {name: portData};
        }

        $.extend(this, portData);

        side = side || portData.side;

        /**
         * Side type: 'left', 'top', 'right', 'bottom'
         * @type {string}
         */
        this.side = SIDES[side] ? side : 'right';

        /**
         * @type {string}
         */
        this.name = portData.name;

        /**
         * @type {string}
         */
        this.displayName;

        /**
         * @type {boolean}
         */
        this.empty = typeof this.name !== 'string' || !this.name.length;

        /**
         * Direction type: 'in', 'out', 'in-out'
         * @type {string}
         */
        this.direction = portData.direction === 'out' ? 'out' : portData.direction === 'in' ? 'in' : 'in-out';

        /**
         * @type {number}
         */
        this.space = this.space === undefined ? 1 : this.space;

        /**
         * @type {number}
         */
        this.spaceBegin = portData.spaceBegin || 0;

        /**
         * @type {number}
         */
        this.spaceEnd = portData.spaceEnd || 0;

        /**
         * @type {string}
         */
        this.lineColor;

        /**
         * @type {number}
         */
        this.lineWidth;

        /**
         * @type {string}
         */
        this.lineStyle;

        /**
         * @type {string}
         */
        this.lineLength;

        /**
         * @type {number}
         */
        this.index = index;

        /**
         * @type {boolean|number}
         */
        this.rest;

        /**
         * @type {number}
         */
        this.maxLinkCount = this.rest ? 1 : this.maxLinkCount ? Math.max(1, this.maxLinkCount) : 1;

        /**
         * @type {boolean}
         */
        this.free = !this.rest && this.free !== false;

        /**
         * @type {number}
         */
        this.restMinIndex = this.restMinIndex === undefined ? 1 : this.restMinIndex;

        /**
         * @type {number}
         */
        this.restInitialCount = this.restInitialCount === undefined ? 1 : this.restInitialCount;
    };

    FlowChartElementPort.prototype.getMaxRestCount = function() {
        if (this.rest === true) {
            return Number.MAX_SAFE_INTEGER;
        }
        if (this.rest && typeof this.rest === 'number') {
            return this.rest;
        }
        return 0;
    };

    /**
     * @return {RegExp}
     */
    FlowChartElementPort.prototype.getRestNameRegex = function() {
        if (this.rest) {
            if (!this._restNameRegex) {
                this._restNameRegex = new RegExp('^' + this.name.replace('*', '(\\d+)') + '$');
            }
            return this._restNameRegex;
        }
    };

    FlowChartElementPort.prototype.getRestPortIndex = function(name) {
        var regex = this.getRestNameRegex();
        if (regex) {
            var index = name.match(regex)[1];
            if (typeof index === 'string' && index.length) {
                index = Number.parseInt(index);
                return Number.isNaN(index) ? null : Math.max(0, index - this.restMinIndex);
            }
        }
    };

    FlowChartElementPort.prototype.isMatchRestName = function(name) {
        if (this.rest) {
            return this.getRestNameRegex().test(name);
        }
        return false;
    };

    FlowChartElementPort.prototype.getRestPortNameByIndex = function(index) {
        return this.name.replace('*', index + this.restMinIndex);
    };

    FlowChartElementPort.prototype.getRestPortAt = function(index) {
        if (this.rest) {
            return this.getRestPortByName(this.getRestPortNameByIndex(index));
        }
        return null;
    };

    FlowChartElementPort.prototype.getRestPortByName = function(portName) {
        if (this.isMatchRestName(portName)) {
            if (!this._restPorts) {
                this._restPorts = {};
            }
            var port = this._restPorts[portName];
            if (port) {
                return port;
            }

            var portData = this.exportPort();
            portData.name = portName;
            portData.rest = false;
            portData._restPort = true;
            portData.maxLinkCount = 1;
            port = new FlowChartElementPort(portData);
            this._restPorts[portName] = port;
            return port;
        }
        return null;
    };

    FlowChartElementPort.prototype.exportPort = function() {
        var port = {};
        var that = this;
        $.each(that, function(propName) {
            if (propName[0] !== '_') {
                port[propName] = that[propName];
            }
        });
        return port;
    };

    /**
     * Create ports map
     * @param {{left: Record<string, any>[], right: Record<string, any>[], top: Record<string, any>[], bottom: Record<string, any>[]}} initData
     * @return {left: FlowChartElementPort[], right: FlowChartElementPort[], top: FlowChartElementPort[], bottom: FlowChartElementPort[]}
     */
    FlowChartElementPort.createPortsMap = function(initData) {
        if (!initData) {
            return null;
        }
        var map = {$all: {}, $free: [], $list: [], $rest: []};
        var hasPort;
        $.each(SIDES, function(side) {
            var portsData = initData[side];
            if (typeof portsData === 'number') {
                var portsDataConverted = [];
                for (var i = 1; i <= portsData; ++i) {
                    portsDataConverted.push(side + i);
                }
                portsData = portsDataConverted;
            }
            if (portsData && !$.isArray(portsData)) {
                portsData = [portsData];
            }
            if (portsData && portsData.length) {
                hasPort = true;
                map[side] = portsData.map(function(portData, index) {
                    var port = new FlowChartElementPort(portData, side, index);
                    if (!port.empty) {
                        map.$all[port.name] = port;
                        map.$list.push(port);
                        if (port.free) {
                            map.$free.push(port);
                        }
                        if (port.rest) {
                            map.$rest.push(port);
                        }
                    }
                    return port;
                });
            }
        });
        return hasPort ? map : null;
    };

    /**
     * FlowChartElement
     * @param {Record<string, any>} initData
     * @param {FlowChartElementType} elementType
     */
    var FlowChartElement = function(initData, elementType) {
        $.extend(this, elementType.getElementData(initData));

        /**
         * @type {string}
         */
        this.id;

        /**
         * @type {string}
         */
        this.type;

        /**
         * @type {string}
         */
        this.basicType;

        /**
         * @type {string}
         */
        this.text;

        /**
         * @type {number}
         */
        this.order;

        /**
         * @type {Record<string, any>}
         */
        this.data;

        /**
         * @type {Record<string, any>}
         */
        this.style;

        /**
         * @type {Record<string, any>}
         */
        this.textStyle;

        /**
         * @type {string}
         */
        this.className;

        /**
         * @type {boolean}
         */
        this.visible;

        /**
         * @type {string}
         */

        /**
         * @type {boolean}
         */
        this.isRelation;

        /**
         * @type {boolean}
         */
        this.isNode;

        /**
         * @type {FlowChart}
         */
        this.flowChart;

        /**
         * @type {FlowChartElementType}
         */
        this.elementType;

        /**
         * @type {{top: number, left: number, width: number, height: number}}
         */
        this.bounds = this.position ? {left: this.position.left, top: this.position.top} : {};

        /**
         * @type {{left: number, top: number, custom?: number, from?: string, side?: string}}
         */
        this.position;

        /**
         * @type {JQuery}
         */
        this.$ele;

        /**
         * @type {JQuery}
         */
        this.$text;

        /**
         * @type {Record<string, any>}
         */
        this.lineStyle;

        /**
         * @type {number}
         */
        this.lineWidth;

        /**
         * @type {string}
         */
        this.lineColor;

        /**
         * @type {boolean}
         */
        this.showTextOnSide;

        /**
         * @type {number}
         */
        this.arrowSize;

        /**
         * @type {boolean}
         */
        this.hideArrow;

        /**
         * @type {string}
         */
        this.from;

        /**
         * @type {string}
         */
        this.to;

        /**
         * @type {number}
         */
        this.fromIndex;

        /**
         * @type {number}
         */
        this.toIndex;

        /**
         * @type {FlowChartElement}
         */
        this.fromNode;

        /**
         * @type {FlowChartElement}
         */
        this.toNode;

        /**
         * @type {FlowChartElement[]}
         */
        this.beginSideRels;

        /**
         * @type {FlowChartElement[]}
         */
        this.endSideRels;

        /**
         * @type {Record<string, any>}
         */
        this.shapeStyle;

        /**
         * @type {boolean}
         */
        this.hideArrowToSelf;

        /**
         * @type {Record<string, any>}
         */
        this.borderStyle;

        /**
         * @type {number}
         */
        this.borderWidth;

        /**
         * @type {string}
         */
        this.borderColor;

        /**
        @type {number} */
        this.width;

        /**
        @type {number} */
        this.maxWidth;

        /**
        @type {number} */
        this.minWidth;

        /**
        @type {number} */
        this.height;

        /**
        @type {number} */
        this.siblingsIndex;

        /**
        @type {FlowChartElement[]} */
        this.fromRels;

        /**
        @type {FlowChartElement[]} */
        this.toRels;

        /**
        @type {FlowChartElement[]} */
        this.children;

        /**
        @type {FlowChartElement[]} */
        this.parents;
    };

    /**
     * Sort FlowChartElement list
     * @param {FlowChartElement[]} elementsList
     * @return {FlowChartElement[]}
     */
    FlowChartElement.sort = function(elementsList) {
        return elementsList.sort(function(e1, e2) {
            return e1.order - e2.order;
        });
    };

    /**
     * Export data
     * @return {Record<string, any>}
     */
    FlowChartElement.prototype.exportData = function() {
        var data = {};
        var that = this;
        $.each(that.elementType.props, function(propName, prop) {
            if (prop) {
                if (propName === 'position') {
                    if (that.position.custom) {
                        data[propName] = that.getPosition();
                    }
                } else {
                    var value = that[propName];
                    if (value !== undefined) {
                        data[propName] = value;
                    }
                }
            }
        });
        return data;
    };

    /**
     * Get bounds
     * @return {{top: number, left: number, width: number, height: number, right: number, bottom: number, centerLeft: number, centerTop: number}}
     */
    FlowChartElement.prototype.getBounds = function() {
        if (this._boundsCache) {
            return this._boundsCache;
        }
        var bounds = this.bounds;
        var hasPosition = typeof bounds.left === 'number' && typeof bounds.top === 'number';
        var boundsCache = $.extend({hasPosition: hasPosition}, bounds);
        if (hasPosition) {
            boundsCache.right = bounds.left + bounds.width;
            boundsCache.bottom = bounds.top + bounds.height;
            boundsCache.centerLeft = bounds.left + bounds.width / 2;
            boundsCache.centerTop = bounds.top + bounds.height / 2;
        }
        this._boundsCache = boundsCache;
        return boundsCache;
    };

    /**
     * Change element type
     */
    FlowChartElement.prototype.changeType = function(newType) {
        var that = this;
        if (typeof newType === 'string') {
            newType = that.flowChart.types[newType];
        }
        if (newType) {
            that.type = newType.name;
            that.basicType = newType.type;
            that.isRelation = newType.isRelation;
            that.isNode = newType.isNode;
            that.elementType = newType;
        }
    };

    /**
     * Set bounds
     * @param {{top: number, left: number, width: number, height: number, right: number, bottom: number, centerLeft: number, centerTop: number}} bounds
     */
    FlowChartElement.prototype.setBounds = function(newBounds) {
        var that = this;
        var hasSetPosition = 0;
        var hasSetSize = 0;
        var hasSetShape = 0;
        var bounds = that.bounds;
        if (typeof newBounds.top === 'number') {
            bounds.top = newBounds.top;
            hasSetPosition += 1;
        }
        if (typeof newBounds.left === 'number') {
            bounds.left = newBounds.left;
            hasSetPosition += 2;
        }
        if (typeof newBounds.width === 'number' && newBounds.width >= 0) {
            bounds.width = newBounds.width;
            hasSetSize += 1;
        }
        if (typeof newBounds.height === 'number' && newBounds.height >= 0) {
            bounds.height = newBounds.height;
            hasSetSize += 2;
        }
        if (that.isNode && hasSetPosition && that.position.custom === undefined) {
            that.position.custom = true;
        }
        if (hasSetPosition === 3 && hasSetSize === 3) {
            var flowChartBounds = that.flowChart.bounds;
            flowChartBounds.left   = Math.min(flowChartBounds.left, bounds.left);
            flowChartBounds.top    = Math.min(flowChartBounds.top, bounds.top);
            flowChartBounds.width  = Math.max(flowChartBounds.width, bounds.left + bounds.width);
            flowChartBounds.height = Math.max(flowChartBounds.height, bounds.top + bounds.height);
        }
        if (this.isRelation) {
            if (newBounds.shape && typeof newBounds.shape === 'object') {
                bounds.shape = $.extend({}, bounds.shape, newBounds.shape);
                $.each(bounds.shape, function(shapeKey) {
                    if (bounds.shape[shapeKey]) {
                        hasSetShape++;
                    }
                });
                if (hasSetShape) {
                    that.position = that.position ? $.extend(that.position, {custom: true}) : {custom: true};
                }
            }
        }
        if (hasSetPosition || hasSetSize || hasSetShape) {
            that._boundsCache = null;
        }
    };

    /**
     * Check current node is intersect with other one
     * @return {FlowChartElement} otherNode
     * @return {boolean}
     */
    FlowChartElement.prototype.isIntersectWith = function(otherNode) {
        if (!this.isNode || !otherNode.isNode) {
            return false;
        }
        var node1Bounds = this.getBounds();
        var node2Bounds = otherNode.getBounds();
        return !((node2Bounds.right < node1Bounds.left)
            || (node2Bounds.left > node1Bounds.right)
            || (node2Bounds.bottom < node1Bounds.top)
            || (node2Bounds.top > node1Bounds.bottom));
    };

    /**
     * Init element before render
     */
    FlowChartElement.prototype.initBeforeRender = function() {
        var that = this;
        if (that.isNode) {
            delete that.siblingsIndex;
            that.fromRels = [];
            that.toRels   = [];
            that.children = [];
            that.parents  = [];
        }
    };

    FlowChartElement.prototype.getFromNodeOfRelation = function() {
        var that = this;
        if (!that.fromNode && that.from) {
            that.fromNode = that.flowChart.getElement(that.from);
        }
        return that.fromNode;
    };

    FlowChartElement.prototype.getToNodeOfRelation = function() {
        var that = this;
        if (!that.toNode && that.to) {
            that.toNode = that.flowChart.getElement(that.to);
        }

        return that.toNode;
    };

    /**
     * @return {{fromPort: FlowChartElementPort, toPort: FlowChartElementPort}}
     */
    FlowChartElement.prototype.getPortsInfoOfRelation = function() {
        var that = this;
        if (that._relationPortsInfo === undefined) {
            var fromNode = that.getFromNodeOfRelation();
            var toNode   = that.getToNodeOfRelation();
            if (!fromNode || !toNode) {
                that._relationPortsInfo = null;
            } else {
                var fromPort, toPort;
                if (that.fromPort) {
                    fromPort = fromNode.getPortByName(that.fromPort);
                }
                if (that.toPort) {
                    toPort = toNode.getPortByName(that.toPort);
                }
                if (that.flowChart.options.allowFreePorts && !that.fromPort || !that.toPort) {
                    var fromBounds = fromNode.getBounds();
                    var toBounds = toNode.getBounds();
                    var centerPoint = {
                        left: (fromBounds.centerLeft + toBounds.centerLeft) / 2,
                        top: (fromBounds.centerTop + toBounds.centerTop) / 2,
                    };

                    var getNearestPort = function(node) {
                        var $ports = node.$ports.find('.flowchart-port-free');
                        var minDistance = Number.MAX_VALUE;
                        var minPortName;
                        if ($ports.length) {
                            $ports.each(function() {
                                var $port = $(this);
                                var $dot = $port.find('.flowchart-port-dot');
                                var portPosition = that.flowChart.getPositionOf($dot, true);
                                var distance = distanceOfTwoPoints(portPosition, centerPoint);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    minPortName = $port.data('name');
                                }
                            });
                        }

                        if (minPortName) {
                            return node.getPortByName(minPortName);
                        }
                    };

                    if (!that.fromPort) {
                        fromPort = getNearestPort(fromNode);
                    }
                    if (!that.toPort) {
                        toPort = getNearestPort(toNode);
                    }
                }
                if (fromPort && toPort) {
                    that._relationPortsInfo = {fromPort: fromPort, toPort: toPort};
                }
            }
        }
        return that._relationPortsInfo;
    };

    FlowChartElement.prototype.getFromPort = function() {
        var portsInfo = this.getPortsInfoOfRelation();
        return portsInfo && portsInfo.fromPort;
    };

    FlowChartElement.prototype.getToPort = function() {
        var portsInfo = this.getPortsInfoOfRelation();
        return portsInfo && portsInfo.toPort;
    };

    /**
     * Init relation nodes before render
     */
    FlowChartElement.prototype.initRelationBeforeRender = function() {
        var that = this;
        if (that.isRelation) {
            var fromNode = that.flowChart.getElement(that.from);
            var toNode = that.flowChart.getElement(that.to);
            that.visible = !!(fromNode && toNode);
            if (that.visible) {
                that.fromIndex = fromNode.fromRels.length;
                that.toIndex   = fromNode.toRels.length;
                that.fromNode  = fromNode;
                that.toNode    = toNode;

                fromNode.fromRels.push(that);
                toNode.toRels.push(that);
                fromNode.children.push(toNode);
                toNode.parents.push(fromNode);
            }
        }
    };

    /**
     * Get dom element ID
     * @param {boolean} [excludeCssPrefix]
     * @return {string}
     */
    FlowChartElement.prototype.getDomID = function(excludeCssPrefix) {
        return this.flowChart.getDomID(this, excludeCssPrefix);
    };

    /**
     * Get dom element of current
     * @param {string} [selector]
     * @return {JQuery}
     */
    FlowChartElement.prototype.$get = function(selector) {
        var $element = this.flowChart.$findElement(this.id);
        return selector ? $element.find(selector) : $element;
    };

    FlowChartElement.prototype.moveToTop = function(zIndex) {
        if (zIndex === undefined) {
            zIndex = this.flowChart.newZIndex();
        }
        this.$ele.css('zIndex', zIndex);
    };

    FlowChartElement.prototype.active = function(moveToTop) {
        this.$ele.addClass('flowchart-active');
        if (moveToTop) {
            this.moveToTop();
        }
        this.render(true);
    };

    FlowChartElement.prototype.unactive = function() {
        this.blurText();
        this.$ele.removeClass('flowchart-active');
        this.render(true);
    };

    FlowChartElement.prototype.focusText = function() {
        selectText(this.$text.attr('contenteditable', true));
        this.$ele.addClass('flowchart-element-focused');
        this.$text.focus();
    };

    FlowChartElement.prototype.blurText = function() {
        this.$text.attr('contenteditable', false);
        this.$ele.removeClass('flowchart-element-focused');
    };

    FlowChartElement.prototype.setText = function(text) {
        if (text !== this.text) {
            this.text = text;
            return true;
        }
    };

    /**
     * Get actual ports, if side set then return port at given side
     * @param {string} [side]
     */
    FlowChartElement.prototype.getPorts = function(side) {
        if (this.isRelation) {
            return null;
        }
        if (side) {
            return this.elementType.ports[side];
        }
        return this.elementType.ports.$list;
    };

    /**
     * Get actual port by port name
     * @return {FlowChartElementPort}
     */
    FlowChartElement.prototype.getPortByName = function(name) {
        if (this.isRelation) {
            return null;
        }
        return this.elementType.getPortByName(name, true);

    };

    FlowChartElement.prototype.isActive = function() {
        return this.flowChart.isElementActive(this.id);
    };

    /**
     * @return {boolean}
     */
    FlowChartElement.prototype.isVisible = function() {
        var that = this;
        if (that._hide) {
            return false;
        }
        if (that.isRelation) {
            return !!(that.fromNode && that.toNode && that.getPortsInfoOfRelation());
        }
        return true;
    };

    /**
     * Render relation
     */
    FlowChartElement.prototype.renderRelation = function() {
        var that    = this;
        var flowChart = that.flowChart;
        var options = flowChart.options;

        delete that._relationPortsInfo;

        var $relation = that.$get();
        if ($relation.length && $relation.data('type') !== that.type) {
            $relation.remove();
            if (that.relationLineID) {
                $('#' + that.relationLineID).remove();
            }
            $relation = null;
        }
        var visible = that.isVisible();
        if (visible && (!$relation || !$relation.length)) {
            var template = ifUndefinedOrNullThen(that.elementType.template, options.relationTemplate);
            if (typeof template === 'function') {
                template = template(that);
            } else {
                template = template.format($.extend({
                    domID: that.getDomID(true),
                }, that));
            }
            $relation = $(template).addClass(that.className).appendTo(flowChart.$canvas);
        }
        if ($relation && !visible) {
            $relation.remove();
            if (that.relationLineID) {
                $('#' + that.relationLineID).remove();
            }
            return;
        }
        that.$ele = $relation;

        // update node data properties to dom element
        $relation.data(that.data);

        // Update attributes on dom element
        $relation.toggleClass('flowchart-active', that.isActive());

        // Update text
        var textStyle = $.extend({}, options.relationTextStyle, that.elementType.textStyle, that.textStyle);
        var $text = $relation.find('.flowchart-text');
        var text = that.getText();
        $text.css(textStyle).text(text).toggleClass('flowchart-has-text', typeof text === 'string' && text.length > 0);
        that.$text = $text;

        var fromNode          = that.getFromNodeOfRelation();
        var toNode            = that.getToNodeOfRelation();
        var isActive          = that.isActive();
        var lineStyle         = ifUndefinedThen(that.lineStyle, that.elementType.lineStyle, options.relationLineStyle);
        var lineShape         = ifUndefinedThen(that.lineShape, that.elementType.lineShape, options.relationLineShape);
        var lineColor         = isActive ? options.activeColor : ifUndefinedThen(that.lineColor, that.elementType.lineColor, options.relationLineColor);
        var lineSize          = ifUndefinedThen(that.lineWidth, that.elementType.lineWidth, options.relationLineWidth);
        var showArrow         = ifUndefinedThen(that.showArrow, that.elementType.showArrow);
        if (showArrow === undefined) {
            if (options.hideArrowToResult && toNode.type === 'result') {
                showArrow = false;
            } else {
                showArrow = true;
            }
        }
        var arrowSize     = ifUndefinedThen(that.arrowSize, that.elementType.arrowSize, options.relationArrowSize);
        var beginArrow    = (showArrow === 'begin' || showArrow === 'both') ? arrowSize : 0;
        var endArrow      = (showArrow === true || showArrow === 'end' || showArrow === 'both') ? arrowSize : 0;
        var shapeStyle    = $.extend({}, that.elementType.shapeStyle, that.shapeStyle);

        $relation.attr('data-shape', lineShape);

        if (that.elementType.render) {
            var style = $.extend({}, options.relationStyle, that.elementType.style, that.style);
            return that.elementType.render.call(that, $relation, {
                style: style,
                shapeStyle: shapeStyle,
                portsInfo: that.getPortsInfoOfRelation(),
                textStyle: textStyle,
                lineStyle: lineStyle,
                isActive: isActive,
                lineSize: lineSize,
                lineColor: lineColor,
                beginArrow: beginArrow,
                endArrow: endArrow,
                relation: that,
            });
        }

        var portsInfo        = that.getPortsInfoOfRelation();
        var $fromPort        = fromNode.$get('.flowchart-port[data-name="' + portsInfo.fromPort.name + '"]');
        var $toPort          = toNode.$get('.flowchart-port[data-name="' + portsInfo.toPort.name + '"]');

        var fromPortPos      = flowChart.getPositionOf($fromPort);
        var toPortPos        = flowChart.getPositionOf($toPort);
        var fromCenterOffset = $fromPort.data('centerOffset');
        var toCenterOffset   = $toPort.data('centerOffset');

        fromPortPos = addTwoPoints(fromPortPos, fromCenterOffset);
        toPortPos = addTwoPoints(toPortPos, toCenterOffset);
        fromPortPos.top = Math.floor(fromPortPos.top);
        fromPortPos.left = Math.floor(fromPortPos.left);
        toPortPos.top = Math.floor(toPortPos.top);
        toPortPos.left = Math.floor(toPortPos.left);

        that.setBounds({
            left: Math.min(fromPortPos.left, toPortPos.left),
            top: Math.min(fromPortPos.top, toPortPos.top),
            width: Math.max(lineSize, Math.abs(fromPortPos.left - toPortPos.left)),
            height: Math.max(lineSize, Math.abs(fromPortPos.top - toPortPos.top)),
        });
        var bounds = that.getBounds();
        var fromPoint = {
            left: fromPortPos.left,
            top: fromPortPos.top,
            offsetLeft: fromPortPos.left - bounds.left,
            offsetTop: fromPortPos.top - bounds.top,
            arrow: beginArrow,
            side: portsInfo.fromPort.side
        };
        var toPoint = {
            left: toPortPos.left,
            top: toPortPos.top,
            offsetLeft: toPortPos.left - bounds.left,
            offsetTop: toPortPos.top - bounds.top,
            arrow: endArrow,
            side: portsInfo.toPort.side
        };

        var $lines = that.$get('.flowchart-relation-lines').empty();
        that.relationLineID = 'flowchart-' + flowChart.id + '-line-' + that.id;
        flowChart.drawRelationLine(that.relationLineID, fromPoint, toPoint, {
            shapeStyle: shapeStyle,
            style: lineStyle,
            width: lineSize,
            color: lineColor,
            shape: lineShape,
            isActive: isActive,
            activeColor: options.activeColor,
            relation: that,
            className: 'flowchart-relation-line' + (isActive ? ' flowchart-relation-line-active' : ''),
            bounds: bounds
        }, $lines, $text);

        $relation.css({
            top: bounds.top,
            left: bounds.left,
            width: bounds.width,
            height: bounds.height,
        });

        flowChart.callCallback('onRenderRelation', [$relation, that]);
        return;
    };

    /**
     * Get text
     * @return {string}
     */
    FlowChartElement.prototype.getText = function() {
        var text = this.text;
        if (text === undefined) {
            text = this.elementType.text;
        }
        return (text === undefined || text === null) ? '' : String(text);
    };

    FlowChartElement.prototype.appendRestPortHolder = function(name) {
        var port = this.elementType.getPortByName(name);
        if (port && this._restPortsCounter) {
            this._restPortsCounter[port.name]++;
            this.freshRender();
        }
    };

    FlowChartElement.prototype.getRelationsByPort = function(portName) {
        var that = this;
        var relations = [];
        if (that.fromRels && that.fromRels.length) {
            that.fromRels.forEach(function(rel) {
                if (rel.fromPort && rel.fromPort === portName) {
                    relations.push(rel);
                }
            });
        }
        if (that.toRels && that.toRels.length) {
            that.toRels.forEach(function(rel) {
                if (rel.toPort && rel.toPort === portName) {
                    relations.push(rel);
                }
            });
        }
        return relations;
    };

    /**
     * Get rest ports
     */
    FlowChartElement.prototype.getRestPorts = function(originPort, appendEmptyPort = true) {
        if (originPort.rest) {
            if (appendEmptyPort === undefined) {
                appendEmptyPort = true;
            }

            // 跟踪可变端口上的最多端口计数
            var that = this;
            if (!that._restPortsCounter) {
                that._restPortsCounter = {};
            }
            if (!that._restPortsCounter[originPort.name]) {
                that._restPortsCounter[originPort.name] = originPort.restInitialCount - 1;
            }

            // 根据可变端口上已有关系，更新最多端口计数
            var restPortsIndexMap = {};
            var maxRestPortIndex = that._restPortsCounter[originPort.name];
            if (that.fromRels && that.fromRels.length) {
                that.fromRels.forEach(function(rel) {
                    if (rel.fromPort && originPort.isMatchRestName(rel.fromPort)) {
                        var relPortIndex = originPort.getRestPortIndex(rel.fromPort);
                        while (restPortsIndexMap[relPortIndex]) {
                            relPortIndex++;
                        }
                        restPortsIndexMap[relPortIndex] = 1;
                        maxRestPortIndex = Math.max(relPortIndex, maxRestPortIndex);
                        rel.fromPort = originPort.getRestPortNameByIndex(relPortIndex);
                    }
                });
            }
            if (that.toRels && that.toRels.length) {
                that.toRels.forEach(function(rel) {
                    if (rel.toPort && originPort.isMatchRestName(rel.toPort)) {
                        var relPortIndex = originPort.getRestPortIndex(rel.toPort);
                        while (restPortsIndexMap[relPortIndex]) {
                            relPortIndex++;
                        }
                        restPortsIndexMap[relPortIndex] = 1;
                        maxRestPortIndex = Math.max(relPortIndex, maxRestPortIndex);
                        rel.toPort = originPort.getRestPortNameByIndex(relPortIndex);
                    }
                });
            }
            that._restPortsCounter[originPort.name] = maxRestPortIndex;

            var ports = [];
            for (var i = 0; i <= maxRestPortIndex; ++i) {
                var port = originPort.getRestPortAt(ports.length);
                port._restHolder = false;
                ports.push(port);
            }
            if (appendEmptyPort && maxRestPortIndex < originPort.getMaxRestCount()) {
                var port = originPort.getRestPortAt(ports.length);
                port._restHolder = true;
                ports.push(port);
            }
            return ports;
        }
        return [];
    };

    /**
     * Render ports
     */
    FlowChartElement.prototype.renderPorts = function() {
        var that = this;
        var elementType = that.elementType;
        var ports = elementType.ports;
        if (!ports) {
            return;
        }
        var options = that.flowChart.options;
        var $node = that.$ele;
        var $ports = $node.find('.flowchart-ports');
        if (!$ports.length) {
            $ports = $([
                '<div class="flowchart-ports" style="position:absolute;top:0;right:0;bottom:0;left:0">',
                    '<div class="flowchart-ports-side flowchart-ports-top" style="position:absolute;top:0;left:50%"></div>',
                    '<div class="flowchart-ports-side flowchart-ports-bottom" style="position:absolute;bottom:0;left:50%"></div>',
                    '<div class="flowchart-ports-side flowchart-ports-left" style="position:absolute;top:50%;left:0"></div>',
                    '<div class="flowchart-ports-side flowchart-ports-right" style="position:absolute;top:50%;right:0"></div>',
                '</div>'
            ].join('')).appendTo($node);
        }
        that.$ports = $ports;
        var sideSizes = {left: 0, right: 0, top: 0, bottom: 0};
        var portSize = options.portSpaceSize || 20;
        var renderSidePort = function($side, side, port) {
            var spaceSize = Math.floor(port.space * portSize);
            var spaceBegin = Math.floor(port.spaceBegin * portSize);
            var spaceEnd = Math.floor(port.spaceEnd * portSize);
            var sideOffset = sideSizes[side];
            sideSizes[side] += spaceBegin + spaceSize + spaceEnd;
            if (port.empty) {
                return;
            }

            var lineLength = ifUndefinedThen(port.lineLength, elementType.portLineLength, options.portLineLength);
            var lineWidth = Math.max(1, ifUndefinedThen(port.lineWidth, elementType.portLineWidth, options.portLineWidth));
            var lineStyle = ifUndefinedThen(port.lineStyle, elementType.portLineStyle, options.portLineStyle);
            var lineColor = ifUndefinedThen(port.lineColor, elementType.portLineColor, options.portLineColor);
            var portStyle = {};
            var portLineStyle = lineLength && {};
            var portDotStyle = {
                width: lineWidth + 8,
                height: lineWidth + 8,
            };
            var portCenterOffset = {};
            if (side === 'left' || side === 'right') {
                portStyle.top = sideOffset + spaceBegin;
                portStyle.width = lineLength + 2 * portDotStyle.width;
                portStyle.left = side === 'left' ? (0 - portStyle.width) : 0;
                portStyle.height = spaceSize;
                if (lineLength) {
                    portLineStyle.top = Math.floor((spaceSize - lineWidth) / 2);
                    portLineStyle[side === 'left' ? 'right' : 'left'] = 0;
                    portLineStyle.width = lineLength;
                    portLineStyle.borderBottomStyle = lineStyle;
                    portLineStyle.borderBottomWidth = lineWidth;
                    portLineStyle.borderBottomColor = lineColor;
                }
                portDotStyle.top = Math.floor((spaceSize - portDotStyle.height) / 2);
                portDotStyle[side] = portStyle.width - lineLength - portDotStyle.width;

                portCenterOffset.top = spaceSize / 2;
                portCenterOffset.left = side === 'left' ? (portStyle.width - portLineStyle.width) : portLineStyle.width;
            } else {
                portStyle.left = sideOffset + spaceBegin;
                portStyle.height = lineLength + 2 * portDotStyle.width;
                portStyle.top = side === 'top' ? (0 - portStyle.height) : 0;
                portStyle.width = spaceSize;
                if (lineLength) {
                    portLineStyle.left = Math.floor((spaceSize - lineWidth) / 2);
                    portLineStyle[side === 'top' ? 'bottom' : 'top'] = 0;
                    portLineStyle.height = lineLength;
                    portLineStyle.borderRightStyle = lineStyle;
                    portLineStyle.borderRightWidth = lineWidth;
                    portLineStyle.borderRightColor = lineColor;
                }
                portDotStyle.left = Math.floor((spaceSize - portDotStyle.width) / 2);
                portDotStyle[side] = portStyle.height - lineLength - portDotStyle.height;

                portCenterOffset.top = side === 'top' ? (portStyle.height - portLineStyle.height) : portLineStyle.height;
                portCenterOffset.left = spaceSize / 2;
            }
            var $port = $side.find('.flowchart-port[data-id="' + that.id + '"]');
            if (!$port.length) {
                $port = $('<div class="flowchart-port flowchart-port-' + side + '" id="flowchart-port-' + that.id + '-' + port.name + '" data-id="' + that.id + '-' + port.name + '" data-side="' + port.side + '" data-name="' + port.name + '" style="position:absolute;z-index:2"></div>').css(portStyle);
                $port.appendTo($side);
            } else {
                $port.attr({'data-name': port.name}).removeClass('flowchart-port-expired');
            }
            if (lineLength) {
                $('<div class="flowchart-port-line" style="position:absolute"></div>').css(portLineStyle).appendTo($port);
            }
            $port.data('centerOffset', portCenterOffset).toggleClass('flowchart-port-free', port.free).append($('<div class="flowchart-port-dot" style="position:absolute"></div>').css(portDotStyle));
            $port.toggleClass('flowchart-port-rest-holder', !!port._restHolder);
        };
        $.each(sideSizes, function(side) {
            var $side = $ports.find('.flowchart-ports-' + side);
            var sidePorts = ports[side];
            if (!sidePorts || !sidePorts.length) {
                $side.empty();
                return;
            }
            $side.find('.flowchart-port').addClass('flowchart-port-expired');
            sidePorts.forEach(function(port) {
                if (port.rest) {
                    return that.getRestPorts(port).forEach(renderSidePort.bind(null, $side, side));
                }
                renderSidePort($side, side, port);
            });
            $side.css(side === 'left' || side === 'right' ? 'margin-top' : 'margin-left', 0 - Math.floor(sideSizes[side] / 2));
        });
        $ports.find('.flowchart-port-expired').remove();
        $node.css({
            minWidth: Math.max(sideSizes.top, sideSizes.bottom),
            minHeight: Math.max(sideSizes.left, sideSizes.right),
        });
    };

    /**
     * Render node
     * @param {boolean} [skipLayout]
     */
    FlowChartElement.prototype.renderNode = function(skipLayout) {
        var that = this;
        var flowChart = that.flowChart;
        var options = flowChart.options;
        var elementType = that.elementType;
        var isActive = that.isActive();

        // Get or create node dom element
        var $node = that.$get();
        if ($node.length && $node.data('type') !== that.type) {
            $node.remove();
            $node = null;
        }
        if (!$node || !$node.length) {
            var template = ifUndefinedOrNullThen(elementType.template, options.nodeTemplate);
            if (typeof template === 'function') {
                template = template(that);
            } else {
                template = template.format($.extend({
                    domID: that.getDomID(true),
                    cursor: (flowChart.draggableEnable && options.draggable && options.readonly !== true) ? 'move' : 'default',
                    zIndex: that.flowChart.newZIndex()
                }, that));
            }

            $node = $(template).addClass(that.className).appendTo(flowChart.$canvas);
        }
        that.$ele = $node;

        // update node data properties to dom element
        $node.data(that.data);

        // Update attributes on dom element
        $node.toggleClass('flowchart-has-ports', elementType.hasPorts())
            .toggleClass('flowchart-active', isActive);

        // Update text
        var textStyle = $.extend({}, options.nodeTextStyle, elementType.textStyle, that.textStyle);
        var $text = $node.find('.flowchart-text');
        var nodeText = that.getText();
        var hasText = typeof nodeText === 'string' && nodeText.length > 0;
        $text.css(textStyle).text(hasText ? nodeText : ' ').toggleClass('flowchart-has-text', hasText);
        that.$text = $text;

        // Update basic style
        $node.css({
            maxHeight: ifUndefinedThen(that.height, elementType.height, options.nodeHeight),
            maxWidth: ifUndefinedThen(that.maxWidth, elementType.maxWidth, options.nodeMaxWidth),
            minWidth: ifUndefinedThen(that.minWidth, elementType.minWidth, options.nodeMinWidth),
            width: ifUndefinedThen(that.width, elementType.width),
            height: ifUndefinedThen(that.height, elementType.height),
        });

        // Get merged style
        var style = $.extend({}, options.nodeStyle, elementType.style, that.style);
        var shapeStyle = $.extend({
            background: options.nodeBackground
        }, elementType.shapeStyle, that.shapeStyle, {
            borderStyle: that.borderStyle,
            borderWidth: that.borderWidth,
            borderColor: isActive ? options.activeColor : that.borderColor,
        });

        // Render content
        if (elementType.render) {
            elementType.render.call(that, $node, elementType, {style: style, shapeStyle: shapeStyle, textStyle: textStyle, text: nodeText});
        } else {
            if (elementType.hasPorts()) {
                that.renderPorts({style: style, shapeStyle: shapeStyle, textStyle: textStyle, text: nodeText});
            }
            if (elementType.shape === 'diamond') {
                $node.css(style);
                var size = {
                    width:  $node.outerWidth(),
                    height: $node.outerHeight(),
                };
                var $shape = $node.children('.flowchart-shape');
                if (!$shape.length) {
                    $shape = $('<svg class="flowchart-shape" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0"><polygon /></svg>').appendTo($node);
                }
                var $polygon = $shape.children('polygon');
                if (isActive) {
                    shapeStyle.borderWidth = 2;
                }
                $polygon.css(convertCssToSvgStyle(shapeStyle));
                var points = [[0, size.height / 2], [size.width / 2, 0], [size.width, size.height / 2], [size.width / 2, size.height]];
                var pointsStr = [];
                points.forEach(function(point) {
                    pointsStr.push($.isArray(point) ? point.join(',') : point);
                });
                $polygon.attr('points', pointsStr.join(' '));
                $shape.css(size).show();
            } else if (elementType.shape === 'dot') {
                $node.css($.extend(style, shapeStyle));
                var newTextStyle = {position: 'absolute'};
                if (that.textPosition === 'top') {
                    newTextStyle.bottom = '100%';
                } else {
                    newTextStyle.top = '100%';
                }
                $text.css(newTextStyle);
            } else if (elementType.shape === 'connection') {
                if (!nodeText) {
                    shapeStyle.padding = 0;
                    $text.css('position', 'absolute');
                } else {
                    $text.css('position', 'relative');
                }
                $node.css($.extend(style, shapeStyle));
            }  else {
                $node.css($.extend(style, shapeStyle));
            }
        }

        flowChart.callCallback('onRenderNode', [$node, that]);

        // Set size to bounds
        that.setBounds({
            width:  $node.outerWidth(),
            height: $node.outerHeight(),
        });

        // TODO: Check order
        if (!skipLayout) {
            that.layoutNode();
        }
    };

    /**
     * Get real size
     * @return {{width: number, height: number}}
     */
    FlowChartElement.prototype.getSize = function() {
        return {
            height: this.bounds.height,
            width: this.bounds.width,
        };
    };

    /**
     * Get real position
     * @return {{top: number, left: number}}
     */
    FlowChartElement.prototype.getPosition = function() {
        return this.isRelation ? {
            shape: this.bounds.shape
        } : {
            left: this.bounds.left,
            top: this.bounds.top,
        };
    };

    FlowChartElement.prototype.getSiblingIndex = function() {
        if (this._siblingIndex === undefined) {
            var parents = this.parents;
            if (!this.elementType.beginType && parents && parents.length) {
                var nodeID = this.id;
                this._siblingIndex = parents[0].children.findIndex(function(node) {
                    return nodeID === node.id;
                });
            } else {
                this._siblingIndex = 0;
            }
        }
        return this._siblingIndex;
    };

    FlowChartElement.prototype.getDepth = function() {
        if (this._depth === undefined) {
            var parents = this.parents;
            if (!this.elementType.beginType && parents && parents.length) {
                this._depth = Math.max(0, parents[0].getDepth()) + 1;
            } else {
                this._depth = 0;
            }
        }
        return this._depth;
    };

    FlowChartElement.prototype.getDeptSize = function(isHorzLayout, spaceSize) {
        if (this._depthSize !== undefined) {
            return this._depthSize;
        }
        if (isHorzLayout === undefined) {
            isHorzLayout = this.flowChart.options.autoLayoutDirection === 'horz';
        }
        if (spaceSize === undefined) {
            spaceSize = this.flowChart.options[isHorzLayout ? 'vertSpace' : 'vertSpace'];
        }
        var children = this.children;
        var nodeBounds = this.getBounds();
        var childDepth = this.getDepth() + 1;
        var depthSize = isHorzLayout ? nodeBounds.height : nodeBounds.width;
        if (children && children.length) {
            var childrenDepthSize = 0;
            for (var i = 0; i < children.length; ++i) {
                var child = children[i];
                if (child.getDepth() === childDepth) {
                    if (childrenDepthSize) {
                        childrenDepthSize += spaceSize;
                    }
                    childrenDepthSize += child.getDeptSize(isHorzLayout, spaceSize);
                }
            }
            depthSize = Math.max(depthSize, childrenDepthSize);
        }
        this._depthSize = depthSize;
        return depthSize;
    };

    /**
     * Check whether has set position
     * @return {boolean}
     */
    FlowChartElement.prototype.hasPosition = function() {
        return this.getBounds().hasPosition;
    };

    /**
     * Calculate node position and change layout of it
     * @param {boolean} [skipPosition]
     */
    FlowChartElement.prototype.layoutNode = function(skipPosition) {
        var that = this;
        var flowChart = that.flowChart;
        var options = flowChart.options;
        var position = that.position;
        var bounds = that.getBounds();

        if (!bounds.hasPosition || !position.custom) {
            var newPosition = {};
            if (typeof position.centerLeft === 'number' && typeof position.centerTop === 'number') {
                newPosition.left = position.centerLeft - Math.floor(bounds.width / 2);
                newPosition.top = position.centerTop - Math.floor(bounds.height / 2);
            } else {
                var parents = that.parents;
                var direction = position.direction;
                var directionFrom = position.from;
                if (typeof directionFrom === 'string') {
                    directionFrom = flowChart.getElement(directionFrom);
                }

                if (direction && SIDES[direction] && directionFrom) {
                    var fromBounds = directionFrom.getBounds();
                    if (direction === 'top') {
                        newPosition.left = Math.floor(fromBounds.centerLeft - (bounds.width / 2));
                        newPosition.top = fromBounds.top - options.vertSpace - bounds.height;
                    } else if (direction === 'left') {
                        newPosition.left = fromBounds.left - options.horzSpace - bounds.width;
                        newPosition.top = Math.floor(fromBounds.centerTop - (bounds.height / 2));
                    } else if (direction === 'bottom') {
                        newPosition.left = Math.floor(fromBounds.centerLeft - (bounds.width / 2));
                        newPosition.top = fromBounds.bottom + options.vertSpace;
                    } else if (direction === 'right') {
                        newPosition.left = fromBounds.right + options.horzSpace;
                        newPosition.top = Math.floor(fromBounds.centerTop - (bounds.height / 2));
                    }
                    delete position.direction;
                    delete position.from;
                    position.custom = 'auto';
                } else if (parents.length) {
                    var parentsBounds;
                    var siblingsIndex = 0;
                    parents.forEach(function(parentNode) {
                        if (!parentNode.hasPosition()) {
                            return;
                        }
                        var parentPosition = parentNode.getPosition();
                        var parentSize = parentNode.getSize();
                        if (parentsBounds) {
                            parentsBounds.left   = Math.min(parentsBounds.left, parentPosition.left);
                            parentsBounds.top    = Math.min(parentsBounds.top, parentPosition.top);
                            parentsBounds.right  = Math.max(parentsBounds.right, parentSize.width + parentPosition.left);
                            parentsBounds.bottom = Math.max(parentsBounds.bottom, parentSize.height + parentPosition.top);
                        } else {
                            parentsBounds = {
                                left:   parentPosition.left,
                                top:    parentPosition.top,
                                right:  parentSize.width + parentPosition.left,
                                bottom: parentSize.height + parentPosition.top
                            };
                        }

                        if (that.siblingsIndex === undefined) {
                            var parentChildren = parentNode.children;
                            if (parentChildren.length) {
                                parentChildren.forEach(function(childNode) {
                                    if (childNode.siblingsIndex === undefined) {
                                        childNode.siblingsIndex = siblingsIndex++;
                                    }
                                });
                            }
                        }
                    });
                    if (options.autoLayoutDirection === 'horz') {
                        newPosition.left = parentsBounds.right + options.horzSpace;
                        newPosition.top  = parentsBounds.top + that.siblingsIndex * (options.nodeHeight + options.vertSpace);
                    } else {
                        newPosition.top = parentsBounds.bottom + options.vertSpace;
                        newPosition.left  = parentsBounds.left + that.siblingsIndex * (options.nodeMinWidth + options.horzSpace);
                    }
                } else {
                    var canvasBounds = flowChart.bounds;
                    newPosition.left = canvasBounds.left;
                    newPosition.top  = canvasBounds.top + canvasBounds.height + (canvasBounds.height <= options.padding ? 0: (options.vertSpace - options.padding));
                }
            }
            that.setBounds(newPosition);
            if (position.custom === undefined) {
                position.custom = true;
            }
        }

        if (!skipPosition) {
            var adsorptionGrid = options.adsorptionGrid;
            if (adsorptionGrid) {
                bounds = that.getBounds();
                that.setBounds({
                    left: Math.round(bounds.left / adsorptionGrid) * adsorptionGrid,
                    top: Math.round(bounds.top / adsorptionGrid) * adsorptionGrid
                });
            }
            that.$ele.css(that.getPosition());
        }
    };

    FlowChartElement.prototype.freshRender = function() {
        this.flowChart._initElementsRelation();
        return this.flowChart.render(this.id);
    };

    FlowChartElement.prototype.render = function(skipLayout) {
        return this.isRelation ? this.renderRelation() : this.renderNode(skipLayout);
    };

    FlowChartElement.prototype.layout = function(skipPosition) {
        if (this.isNode) {
            this.layoutNode(skipPosition);
        }
    };

    FlowChartElement.prototype.isHidden = function() {
        return !this.isVisible();
    };

    FlowChartElement.prototype.hide = function(skipRender) {
        if (!this._hide) {
            this._hide = true;
            if (!skipRender) {
                this.freshRender();
            }
        }
    };

    FlowChartElement.prototype.show = function(skipRender) {
        if (this._hide) {
            this._hide = false;
            if (!skipRender) {
                this.freshRender();
            }
        }
    };

    /**
     * Get element's data
     * @param {string} [name]
     */
    FlowChartElement.prototype.getData = function(name) {
        if (name === undefined) {
            return $.extend({}, this.data);
        }
        return this.data[name];
    };

    /**
     * Set element's data
     * @param {string|Record<string,any>} name
     * @param {any} [value]
     */
    FlowChartElement.prototype.setData = function(name, value) {
        var newData;
        if (typeof name === 'object' && name !== null) {
            newData = value;
        } else {
            newData = {};
            newData[name] = value;
        }
        if (this.flowChart.callCallback('beforeSetData', [newData, this]) === false) {
            return;
        }
        $.extend(this.data, newData);
        this.flowChart.callCallback('afterSetData', [newData, this]);
    };

    var FlowChartElementType = function(elementTypes) {
        if ($.isArray(elementTypes)) {
            elementTypes.unshift(true, this);
        } else {
            elementTypes = [true, this, elementTypes];
        }
        $.extend.apply(null, elementTypes);

        /**
         * @type {boolean}
         */
        this.isRelation = this.type === 'relation';

        /**
         * @type {boolean}
         */
        this.isNode = !this.isRelation;

        /**
         * @type {Record<string, Function|boolean|string>}
         */
        this.props;

        /**
         * @type {Record<string, string>}
         */
        this.style;

        /**
         * @type {Record<string, string>}
         */
        this.textStyle;

        /**
         * @type {string}
         */
        this.shape;

        /**
         * @type {Record<string, string>}
         */
        this.shapeStyle;

        /**
         * @type {boolean}
         */
        this.hideArrowToSelf;

        /**
         * @type {number}
         */
        this.height;

        /**
         * @type {number}
         */
        this.maxWidth;

        /**
         * @type {number}
         */
        this.minWidth;

        /**
         * @type {Function}
         */
        this.render;

        /**
         * @type {Function|string}
         */
        this.template;

        /**
         * @type {string}
         */
        this.text;

        /**
         * @type {boolean|Function}
         */
        this.edit;

        /**
         * @type {string}
         */
        this.desc;

        /**
         * @type {{left: FlowChartElementPort[], right: FlowChartElementPort[], top: FlowChartElementPort[], bottom: FlowChartElementPort[]}}
         */
        this.ports = FlowChartElementPort.createPortsMap(this.ports);
    };

    FlowChartElementType.prototype.getPortByName = function(name, tryReturnRestPort) {
        var that = this;
        var ports = that.ports;
        if (ports) {
            var port = ports.$all[name];
            if (port) {
                return port;
            }
            if (ports.$rest.length) {
                for (var i = 0; i < ports.$rest.length; ++i) {
                    var port = ports.$rest[i];
                    if (port.isMatchRestName(name)) {
                        return tryReturnRestPort ? port.getRestPortByName(name) : port;
                    }
                }
            }
        }
        return null;
    };

    FlowChartElementType.prototype.hasPorts = function() {
        return !!this.ports;
    };

    FlowChartElementType.prototype.getElementData = function(initData) {
        var data = {};
        var that = this;
        $.each(that.props, function(propName, prop) {
            if (prop) {
                data[propName] = typeof prop === 'function' ? prop(initData[propName], that, initData) : initData[propName];
            }
        });
        data.type = that.name;
        data.basicType = that.type;
        data.isRelation = that.isRelation;
        data.isNode = that.isNode;
        data.elementType = that;
        return data;
    };

    FlowChartElementType.prototype.createElement = function(initData, flowChart) {
        var element = new FlowChartElement(initData, this);
        element.flowChart = flowChart;
        return element;
    };

    FlowChartElementType.prototype.exportType = function(includeEmptyPorts) {
        var that = this;
        var type = {
            name: that.name,
            shape: that.shape,
            isRelation: that.isRelation,
            isNode: that.isNode,
            displayName: that.displayName,
            internal: that.internal,
            type: that.type,
        };
        var ports = that.ports;
        if (ports) {
            var portsToExport = {};
            ['left', 'top', 'right', 'bottom'].forEach(function(side) {
                var sidePorts = ports[side];
                if (sidePorts && sidePorts.length) {
                    var sidePOrtsToExport = [];
                    sidePorts.forEach(function(port) {
                        if (!port.empty || includeEmptyPorts) {
                            var portToExport = port.exportPort();
                            delete portToExport.empty;
                            delete portToExport.side;
                            delete portToExport.space;
                            delete portToExport.spaceBegin;
                            delete portToExport.spaceEnd;
                            delete portToExport.index;
                            sidePOrtsToExport.push(portToExport);
                        }
                    });
                    if (sidePOrtsToExport.length) {
                        portsToExport[side] = sidePOrtsToExport;
                    }
                }
            });
            type.ports = portsToExport;
        }
        return type;
    };

    /**
     * The flowChart model class
     * @class
     */
    var FlowChart = function(element, initOptions) {
        /**
         * @type {FlowChart}
         */
        var that = this;
        that.name = NAME;

        // Get container
        var $container = that.$container = $(element).addClass('scrollbar-hover')
            .css('overflow', 'auto');

        /**
         * @type {string}
         */
        that.id = $container.attr('id') || 'flowchart_' + $.zui.uuid();
        if (!$container.attr('id')) {
            $container.attr('id', that.id);
        }

        // Get options
        var options = $.extend(
            {},
            FlowChart.DEFAULTS,
            $container.data(),
            initOptions
        );
        if (options.plugins) {
            if (typeof options.plugins === 'string') {
                options.plugins = options.plugins.split(',');
            }
            var pluginsMap = {};
            var plugins = [];
            var addPlugin = function(pluginName) {
                var plugin = FlowChart.plugins[pluginName];
                if (!plugin) {
                    return false;
                }
                if (!pluginsMap[pluginName] && plugin) {
                    if (plugin.plugins) {
                        plugin.plugins.forEach(function(pluginRequiredPluginName) {
                            if (addPlugin(pluginRequiredPluginName) === false) {
                                throw new Error('FlowChart: Plugin "' + pluginRequiredPluginName + '" not found, it required by plugin "' + pluginName + '".');
                            }
                        });
                    }
                    pluginsMap[pluginName] = 1;
                    plugins.push(pluginName);
                    if (plugin.defaultOptions) {
                        $.extend(true, options, typeof plugin.defaultOptions === 'function' ? plugin.defaultOptions.call(that, options) : plugin.defaultOptions);
                    }
                }
            };
            options.plugins.forEach(function(pluginName) {
                if (addPlugin(pluginName) === false) {
                    throw new Error('FlowChart: Plugin "' + pluginName + '" not found on init from options("' + options.plugins.join(',') + '").');
                }
            });
            $.extend(true, options, $container.data(), initOptions);
            that.plugins = plugins;
        }
        that.options = options;

        var allLangs = $.extend({}, FlowChart.LANGS, options.langs);
        var userLang = options.lang || ($.zui && $.zui.clientLang ? $.zui.clientLang() : 'en');
        that.lang = allLangs[userLang.replace('_', '-')] || allLangs.en;

        // Init element types 初始化元素类型定义
        var types = {};
        $.each(basicElementTypes, function(name, typeData) {
            types[name] = new FlowChartElementType([{type: name, internal: true, name: name, displayName: that.lang['type.' + name]}, typeData]);
        });
        var initialTypes = {};
        $.each(supportElementTypes, function(name, typeData) {
            initialTypes[name] = $.extend(true, {}, typeData, {
                internal: !options.initialTypes
            });
        });
        $.each($.extend(true, {}, initialTypes, options.elementTypes), function(name, typeData) {
            if (name === 'relation') return;
            if (types[name]) {
                var basicType = types[name];
                types[name] = new FlowChartElementType([basicType, {internal: false}, typeof typeData === 'object' ? typeData : null]);
            } else {
                var basicType = types[typeData.type];
                types[name] = new FlowChartElementType([basicType, {internal: false, name: name, displayName: that.lang['type.' + name]}, typeData]);
            }
        });

        /**
         * @type {Record<string, FlowChartElementType>}
         */
        this.types = types;

        // Create canvas
        var $canvas = $container.children('.flowchart-canvas');
        if (!$canvas.length) {
            $canvas = $('<div class="flowchart-canvas" style="position: relative; user-select: none"></div>')
                .appendTo($container);
        }
        var canvasID = 'flowchart-canvas-' + that.id;
        $canvas.attr('id', canvasID).toggleClass('flowchart-allow-free-ports', !!options.allowFreePorts);
        that.$canvas = $canvas;

        // Reset containers size
        if (options.width !== undefined) {
            $container.css('width', options.width);
        }
        if (options.height !== undefined) {
            $container.css('height', options.height);
        }

        // Init draggable event
        that.draggableEnable = !!$.fn.draggable;
        if (that.draggableEnable) {
            if (options.draggable && options.readonly !== true) {
                var handleDragCtrlPoint = function(e) {
                    var newShape = {};
                    var pointName = that._dragCtrlPoint.data('name');
                    if (pointName === 'por') {
                        newShape = $.extend({
                            porX: 0, porY: 0
                        }, that._dragElement.getBounds().shape);
                        var porxSize = that._dragElement.position.porx;
                        var porySize = that._dragElement.position.pory;
                        if (porxSize) {
                            newShape.porX += e.smallOffset.x / porxSize;
                        }
                        if (porySize) {
                            newShape.porY += e.smallOffset.y / porySize;
                        }
                    } else if (pointName === 'arr') {
                        newShape = $.extend({arrX: 0, arrY: 0}, that._dragElement.getBounds().shape);
                        var arcd = that._dragElement.position.arcd;
                        var acdd = that._dragElement.position.acdd;
                        newShape[acdd === 'x' ? 'arrX' : 'arrY'] += e.smallOffset[acdd] / arcd;
                    } else {
                        var boundsShape = $.extend({
                            bboX: 0, bboY: 0, bcoX: 0, bcoY: 0, beoX: 0, beoY: 0
                        }, that._dragElement.getBounds().shape);
                        newShape['b' + pointName + 'oX'] = boundsShape['b' + pointName + 'oX'] + e.smallOffset.x;
                        newShape['b' + pointName + 'oY'] = boundsShape['b' + pointName + 'oY'] + e.smallOffset.y;
                    }
                    that._dragElement.setBounds({shape: newShape});
                    that._dragElement.render();
                };
                $canvas.draggable({
                    move: false,
                    container: '#' + canvasID,
                    selector: '.flowchart-node,.flowchart-relation-line-ctrl-point,.flowchart-relation-text',
                    stopPropagation: true,
                    drag: function(e) {
                        if (!that._dragElement) {
                            var $target = $(e.element);
                            var dragElementID = $target.data('id');
                            var dragCtrlPoint = null;
                            if ($target.hasClass('flowchart-relation-text')) {
                                dragElementID = $target.closest('.flowchart-relation').data('id');
                                dragCtrlPoint = $('#flowchart-flowchart-line-' + dragElementID).find('.flowchart-relation-primary-ctrl-point');
                                if (!dragCtrlPoint.length) {
                                    dragCtrlPoint = null;
                                }
                            } else if ($target.hasClass('flowchart-relation-line-ctrl-point')) {
                                dragCtrlPoint = $target;
                            } else {
                                dragCtrlPoint = null;
                            }
                            if (dragElementID === null) {
                                return false;
                            }
                            var dragElement = that.getElement(dragElementID);
                            if (dragElement.isNode) {
                                dragElement.moveToTop();
                            }
                            that._dragCtrlPoint = dragCtrlPoint;
                            that._dragElement = dragElement;
                        }
                        if (that._dragCtrlPoint) {
                            handleDragCtrlPoint(e);
                        } else {
                            that.setElementBounds(that._dragElement.id, e.pos);
                        }
                    },
                    finish: function(e) {
                        if (that._dragElement) {
                            if (that._dragCtrlPoint) {
                                handleDragCtrlPoint(e);
                            } else {
                                $(e.element).addClass('flowchart-dragged');
                                that.setElementBounds(that._dragElement.id, e.pos);
                            }
                        }
                        that._dragElement = null;
                        that._dragCtrlPoint = null;
                    },
                    mouseButton: 'left',
                    before: function(e) {
                        var canDrag = !that.isPreventDragNode;
                        if (canDrag) {
                            if ($(e.event.target).closest('.flowchart-ports-side').length) {
                                return false;
                            }
                        }
                        return canDrag;
                    }
                });
            }

            if (!options.readonly) {
                var nodeID = null, $port, $node, $targetPort, $targetNode, sourcePoint, $line, $svgLine, hasDropped, editingRelation, portName, editingDirection;
                $canvas.droppable({
                    container: '#' + canvasID,
                    target: '.flowchart-port,.flowchart-node',
                    selector: '.flowchart-port-dot',
                    mouseButton: 'left',
                    nested: true,
                    before: function() {
                        that.isPreventDragNode = true;
                    },
                    start: function(e) {
                        $port = $(e.element).closest('.flowchart-port');
                        $node = $port.closest('.flowchart-node');
                        nodeID = $node.data('id');
                        portName = $port.data('name');

                        var node = that.getElement(nodeID);
                        editingRelation = node.getRelationsByPort(portName).filter(function(rel) {
                            return that.isElementActive(rel.id);
                        });

                        if (editingRelation && editingRelation.length) {
                            editingRelation = editingRelation[0];
                            editingDirection = editingRelation.from === nodeID ? 'from' : 'to';
                            nodeID = editingRelation[editingDirection === 'from' ? 'to' : 'from'];
                            portName = editingRelation[(editingDirection === 'from' ? 'to' : 'from') + 'Port'];
                            $node = that.$findElement(nodeID);
                            $port = $node.find('.flowchart-port[data-name="' + portName + '"]');
                        } else {
                            editingRelation = null;
                        }
                        sourcePoint = addTwoPoints(that.getPositionOf($port), $port.data('centerOffset'));
                        $port.addClass('flowchart-drag-active');
                        $node.addClass('flowchart-drag-active');

                        $line = $canvas.find('.flowchart-link-line');
                        if (!$line.length) {
                            $line = $('<svg class="flowchart-link-line" style="position: absolute; z-index: 30; top: 0; left: 0; right: 0; bottom: 0"><line x1="50" y1="50" x2="350" y2="350" stroke="' + options.activeColor + '" stroke-width="2"/></svg>').appendTo($canvas);
                        }
                        $svgLine = $line.show().attr({
                            width: $canvas.width(),
                            height: $canvas.height(),
                        }).find('line');
                        if (editingRelation) {
                            editingRelation.hide(true);
                            editingRelation.render();
                        }
                        hasDropped = false;
                    },
                    drag: function(e) {
                        $targetPort && $targetPort.removeClass('flowchart-drop-active');
                        $targetNode && $targetNode.removeClass('flowchart-drop-active');
                        $targetNode = null;
                        $targetPort = null;
                        if (e.target) {
                            var $target = $(e.target);
                            var $thisPort = $target.closest('.flowchart-port');
                            var $thisNode = ($thisPort.length ? $thisPort : $target).closest('.flowchart-node');
                            if ($thisNode.length && $thisNode.data('id') !== nodeID) {
                                $targetNode = $thisNode.addClass('flowchart-drop-active');
                                $targetPort = $thisPort.addClass('flowchart-drop-active');
                            }
                        }

                        var targetPoint = {
                            left: e.position.left + 8,
                            top: e.position.top + 8,
                        };
                        $svgLine.attr({
                            x1: sourcePoint.left,
                            y1: sourcePoint.top,
                            x2: targetPoint.left,
                            y2: targetPoint.top,
                        });
                    },
                    drop: function(e) {
                        if (e.target) {
                            var $target = $(e.target);
                            var $thisPort = $target.closest('.flowchart-port');
                            var $thisNode = ($thisPort.length ? $thisPort : $target).closest('.flowchart-node');
                            if ($thisNode.length) {
                                var toNode = $thisNode.data('id');
                                if (toNode !== nodeID) {
                                    var toPort = $thisPort.data('name');
                                    if (editingDirection) {
                                        if (toNode && toPort) {
                                            editingRelation[editingDirection] = toNode;
                                            editingRelation[editingDirection + 'Port'] = toPort;
                                        }
                                    } else {
                                        var confirmRelationType = options.confirmRelationType;
                                        if (confirmRelationType && $.zui.ContextMenu) {
                                            var menuItems = [{
                                                label: that.lang.selectRelationType,
                                                disabled: true,
                                            }];
                                            if (typeof confirmRelationType === 'string') {
                                                confirmRelationType = confirmRelationType.split(',');
                                            }
                                            if ($.isArray(confirmRelationType)) {
                                                confirmRelationType.forEach(function(name) {
                                                    var typeInfo = that.types[name];
                                                    if ((typeInfo.isRelation) && !typeInfo.internal) {
                                                        menuItems.push({
                                                            label: (typeInfo.displayName || name),
                                                            relationType: name
                                                        });
                                                    }
                                                });
                                            } else {
                                                $.each(that.types, function(name, typeInfo) {
                                                    if ((typeInfo.isRelation) && !typeInfo.internal) {
                                                        menuItems.push({
                                                            label: (typeInfo.displayName || name),
                                                            relationType: name
                                                        });
                                                    }
                                                });
                                            }
                                            var fromNode = nodeID;
                                            var fromPort = portName;
                                            $.zui.ContextMenu.show(menuItems, {
                                                event: e.event,
                                                onClickItem: function(item) {
                                                    that.addRelation(fromNode, fromPort, toNode, toPort, null, item.relationType);
                                                }
                                            });
                                        } else {
                                            that.addRelation(nodeID, portName, toNode, toPort);
                                        }
                                    }
                                }
                                hasDropped = true;
                            }
                        }
                    },
                    always: function(e) {
                        that.isPreventDragNode = false;
                        $port && $port.removeClass('flowchart-drag-active');
                        $node && $node.removeClass('flowchart-drag-active');
                        $targetPort && $targetPort.removeClass('flowchart-drop-active');
                        $targetNode && $targetNode.removeClass('flowchart-drop-active');
                        $line && $line.hide();
                        if (options.quickAdd && !hasDropped && (e.cancel || distanceOfTwoPoints(e.position, sourcePoint) < 20)) {
                            var $target = $(e.event.target);
                            var $thisPort = $target.closest('.flowchart-port');
                            var $thisNode = ($thisPort.length ? $thisPort : $target).closest('.flowchart-node');
                            that.addNode(options.defaultNodeType || 'action', $thisNode.data('id'), $thisPort.data('name'), null, $thisPort.data('side'));
                        }
                        if (editingRelation) {
                            editingRelation.show();
                        }
                        nodeID = null;
                        portName = null;
                        $node = null;
                        $port = null;
                        editingDirection = null;
                        editingRelation = null;
                    }
                });
            }
        }

        // Init drag and drop event
        if (!options.readonly && options.addFromDrop) {
            if (typeof options.addFromDrop === 'string') {
                var $dragElements = $(options.addFromDrop);
                var handDragStart = function(e) {
                    var elementData = $(e.target).data();
                    if (elementData.type) {
                        e.originalEvent.dataTransfer.setData('newElement', JSON.stringify(elementData));
                        $container.addClass('flowchart-drag-start');
                    }
                };
                var handleDragEnd = function(e) {
                    $container.removeClass('flowchart-drag-start').removeClass('flowchart-drag-over');
                };
                if ($dragElements.is('[draggable="true"]')) {
                    $dragElements.on('dragstart', handDragStart).on('dragend', handleDragEnd);
                } else {
                    $dragElements.on('dragstart', '[draggable="true"]', handDragStart).on('dragend', '[draggable="true"]', handleDragEnd);
                }
            }
            var handDragOver = function(e) {
                if (options.onDragOver && options.onDragOver.call(that, e) === false) {
                    return;
                }
                $container.toggleClass('flowchart-drag-over', !!$(e.target).closest('.flowchart-canvas').length);
                e.originalEvent.dataTransfer.effectAllowed = 'copy';
                e.preventDefault();
            };
            $canvas.on('dragenter', handDragOver).on('dragover', handDragOver).on('dragleave', function(e) {
                if (options.onDragLeave && options.onDragLeave.call(that, e) === false) {
                    return;
                }
                $container.toggleClass('flowchart-drag-over', !$(e.target).closest('.flowchart-canvas').length);
            }).on('drop', function(e) {
                if (options.onDrop && options.onDrop.call(that, e) === false) {
                    return;
                }
                e.preventDefault();
                var newElementData = e.originalEvent.dataTransfer.getData('newElement');
                if (newElementData) {
                    try {
                        newElementData = $.parseJSON(newElementData);
                    } catch (e) {
                        console.error('FlowChart: Cannot get correct "newElement" data from drop event\'s dataTransfer.', newElementData, e);
                    }
                    if (newElementData && typeof newElementData === 'object' && newElementData.type) {
                        var canvasOffset = $canvas.offset();
                        that.addElement($.extend({
                            position: {
                                centerLeft: e.clientX - canvasOffset.left + $(window).scrollLeft(),
                                centerTop: e.clientY - canvasOffset.top + $(window).scrollTop(),
                            },
                            text: null,
                        }, newElementData));
                    } else {
                        console.warn('FlowChart: Data format error in  "newElement" data from drop event\'s dataTransfer.', newElementData);
                    }
                }
            });
        }

        // Init edit event
        if (!options.readonly) {
            if (options.doubleClickToEdit) {
                $canvas.on('dblclick', '.flowchart-element,.flowchart-relation-line', function(e) {
                    var $ele = $(this);
                    that.focusElementText($ele.data('id'));
                    e.preventDefault();
                });
            }

            var delaySetTextTimer = null;
            $canvas.on('input', '.flowchart-text[contenteditable=true]', function(e) {
                var $text = $(this);
                if (delaySetTextTimer) {
                    clearTimeout(delaySetTextTimer);
                    delaySetTextTimer = null;
                }
                var text = $text.text();
                delaySetTextTimer = setTimeout(function() {
                    var $ele = $text.closest('.flowchart-element');
                    that.setElementText($ele.data('id'), text, true);
                }, 1000);
            }).on('keydown', function(e) {
                if (e.keyCode === 13 && !e.shiftKey) {
                    e.preventDefault();
                    that.blurElementText();
                    return false;
                }
            }).on('blur', '.flowchart-text', function(e) {
                if (delaySetTextTimer) {
                    clearTimeout(delaySetTextTimer);
                    delaySetTextTimer = null;
                }
                var $text = $(this);
                var $ele = $text.closest('.flowchart-element');
                that.setElementText($ele.data('id'), $text.text());
            });
        }

        // Init contextmenu
        if (options.showContextMenu && $.zui.ContextMenu) {
            $canvas.on('mousedown', '.flowchart-element,.flowchart-relation-line', function(e) {
                if (e.button === 2) {
                    if (that.showContextMenu($(this).data('id'), e)) {
                    }
                }
                e.preventDefault();
                e.returnValue = false;
            }).on('contextmenu', function(e) {
                e.preventDefault();
                e.returnValue = false;
                return false;
            });

            $(document).on('change', '.flowchart-' + that.id + '-type-selector', function() {
                var $select = $(this);
                var nodeID = $select.data('id');
                var node = that.getElement(nodeID);
                if (node) {
                    node.changeType($select.val());
                    that.render(node);
                }
                $.zui.ContextMenu.hide();
            });
        }

        $canvas.on('click', function(e) {
            var $target = $(e.target);
            var $element = $target.closest('.flowchart-element,.flowchart-relation-line');
            if ($element.length) {
                if ($element.hasClass('flowchart-dragged')) {
                    $element.removeClass('flowchart-dragged');
                    return;
                }
                var element = that.getElement($element.data('id'));
                if (element) {
                    var $restPortHolder = $target.closest('.flowchart-port-rest-holder');
                    if ($restPortHolder.length && !options.readonly) {
                        element.appendRestPortHolder($restPortHolder.data('name'));
                    } else {
                        if (options.onClickElement) {
                            options.onClickElement(element, $element);
                        }
                        if (options.activeOnClick) {
                            that.activeElement(element);
                        }
                    }
                }
            } else {
                that.unactiveElements();
            }
        });

        that.updateStyle();

        /**
         * @type {Record<string, FlowChartElement>}
         */
        that.elements = {};

        /**
         * @type {Record<string, FlowChartElement>}
         */
        this.activedElements = {};

        // Init svg
        var $svg = $container.find('.flowchart-svg-canvas');
        if (!$svg.length) {
            $svg = $('<svg class="flowchart-svg-canvas" style="position: absolute; left: 0; top: 0"><defs></defs></svg>').prependTo($canvas);
        }
        that.$svg = $svg;
        that.$svgMarkers = $svg.find('defs');

        // Node z-index
        that.nodeZIndex = 5;

        that.callCallback('onCreate');

        // Update and render init elements
        that.update(options.data, true, true);
        that.render(null, true);

        that.callCallback('afterCreate');
    };

    FlowChart.prototype.newZIndex = function() {
        return this.nodeZIndex++;
    };

    FlowChart.prototype.callCallback = function(callbackName, params) {
        var that = this;
        var result;
        if (that.plugins) {
            that.plugins.forEach(function(pluginName) {
                var plugin = FlowChart.plugins[pluginName];
                if (plugin && plugin[callbackName]) {
                    result = plugin[callbackName].apply(that, params);
                }
            });
        }
        if (that.options[callbackName]) {
            result = that.options[callbackName].apply(that, params);
        }
        return result;
    };

    /**
     * Get position of element
     * @param {FlowChartElement|HTMLElement|JQuery}
     */
    FlowChart.prototype.getPositionOf = function(element, returnCenter) {
        var canvasOffset = this.$canvas.offset();
        if (!element) {
            return canvasOffset;
        }
        var $element;
        if (element instanceof FlowChartElement) {
            $element = element.$get();
        } else {
            $element = $(element);
        }
        var offset = $element.offset();
        var position = {left: offset.left - canvasOffset.left, top: offset.top - canvasOffset.top};
        if (returnCenter) {
            position.left += $element.width() / 2;
            position.top += $element.height() / 2;
        }
        return position;
    };

    FlowChart.prototype.updateStyle = function() {
        var that = this;
        var id = that.id;

        var css = [
            '#{id} {background: #fff; transition: box-shadow .2s;}',
            '#{id}.flowchart-drag-start {box-shadow: 0 0 3px {activeColor}!important}',
            '#{id}.flowchart-drag-over {box-shadow: 0 0 0 2px {activeColor}!important}',
            '#{id} .flowchart-port-dot {opacity: 0; background: {activeColor}; border-radius: 50%; transition: .2s opacity, .2s transform; cursor: pointer;}',
            '#{id} .flowchart-element:hover .flowchart-port-dot {opacity: 0.7}',
            '#{id} .flowchart-element.flowchart-drop-active .flowchart-port-dot {opacity: 0.5; transform: scale(2); background: #333}',
            '#{id} .flowchart-element.flowchart-drop-active .flowchart-drop-active > .flowchart-port-dot {background: {activeColor}}',
            '#{id} .flowchart-element .flowchart-port-dot:hover, #{id} .flowchart-element .flowchart-drag-active > .flowchart-port-dot, #{id} .flowchart-element .flowchart-drop-active > .flowchart-port-dot {opacity: 1; transform: scale(2)}',

            '#{id} .flowchart-node.flowchart-active,',
            '#{id} .flowchart-node.flowchart-drag-active,',
            '#{id} .flowchart-allow-free-ports .flowchart-node.flowchart-drop-active',
            '{border-color: {activeColor}!important; box-shadow: 0 0 0 2px {activeColor}!important}',

            '#{id} .flowchart-node.flowchart-active[data-basic-type="diamond"] {box-shadow: none!important}',

            '#{id} .flowchart-relation {pointer-events: none}',
            '#{id} .flowchart-relation.flowchart-element-focused {pointer-events: auto}',

            '#{id} .flowchart-relation:before {content: " "; display: block; top: -4px; right: -4px; bottom: -4px; left: -4px; position: absolute; border-radius: 50%;}',

            '#{id} .flowchart-relation-text {min-height: 14px; min-width: 12px; opacity: 0; pointer-events: auto}',
            '#{id} .flowchart-relation-text.flowchart-has-text {opacity: 1;}',
            '#{id} .flowchart-relation[data-shape="polyline"] .flowchart-relation-text,',
            '#{id} .flowchart-relation[data-shape="bessel"] .flowchart-relation-text,',
            '#{id} .flowchart-relation[data-shape="arc"] .flowchart-relation-text {cursor: move}',

            '#{id} .flowchart-element-focused .flowchart-relation-text {opacity: 1; pointer-events: auto; border: 1px solid {activeColor}}',

            '#{id} .flowchart-svg-canvas .flowchart-relation-line:hover {stroke: {activeColor}!important}',

            '#{id} .flowchart-port-expired {display: none!important}',

            '#{id} .flowchart-relation-line-ctrl-point {cursor: move; visibility: hidden}',
            '#{id} .flowchart-relation-line:hover .flowchart-relation-line-ctrl-point,',
            '#{id} .flowchart-relation-line-active .flowchart-relation-line-ctrl-point {visibility: visible; z-index: 10}'
        ];

        if (that.plugins) {
            that.plugins.forEach(function(pluginName) {
                var plugin = FlowChart.plugins[pluginName];
                if (plugin && plugin.style) {
                    css.push(typeof plugin.style === 'function' ? plugin.style.call(that) : plugin.style);
                }
            });
        }

        css = css.join('\n').format({
            id: id,
            activeColor: that.options.activeColor,
        });

        var style = document.getElementById('flowchartStyle-' + id);
        if (!style) {
            var head = document.head || document.getElementsByTagName('head')[0];
            var style = document.createElement('style');
            head.appendChild(style);
            style.type = 'text/css';
            style.id = 'flowchartStyle-' + id;
        }
        if (style.styleSheet){
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
    };

    /**
     * Create relation element
     * @param {Record<string, any>} relationData
     * @return {FlowChartElement}
     */
    FlowChart.prototype.createRelation = function(relationData) {
        var elementType = this.types[relationData.type] || this.types[this.options.defaultRelationType];
        return elementType.createElement(relationData, this);
    };

    /**
     * Create elements
     * @param {Record<string, any>} elementData
     * @return {FlowChartElement[]}
     */
    FlowChart.prototype.createElements = function(elementData) {
        var that = this;
        var types = that.types;
        if (elementData instanceof FlowChartElement) {
            return [elementData];
        }
        var elementType = types[elementData.type] || types[that.options.defaultNodeType];
        var element = elementType.createElement(elementData, that);
        var elements = [element];
        if (element.isNode) {
            if (elementData.from) {
                var froms = $.isArray(elementData.from) ? elementData.from : [elementData.from];
                froms.forEach(function(from) {
                    var fromInfo = from.split(':');
                    elements.push(that.createRelation({
                        from: fromInfo[0],
                        to: froms.length > 2 ? (element.id + '.' + fromInfo[1]) : element.id,
                        text: fromInfo[froms.length > 2 ? 2 : 1],
                    }));
                });
            }
            if (elementData.to) {
                var tos = $.isArray(elementData.to) ? elementData.to : [elementData.to];
                $.each(tos, function(_, to) {
                    var toInfo = to.split(':');
                    elements.push(that.createRelation({
                        to: toInfo[0],
                        text: toInfo[froms.length > 2 ? 2 : 1],
                        from: froms.length > 2 ? (element.id + '.' + fromInfo[1]) : element.id,
                    }));
                });
            }
        }
        return elements;
    };

    /**
     * Active element
     * @param {FlowChartElement|string} element
     * @param {boolean} [multiple=false]
     */
    FlowChart.prototype.activeElement = function(element, multiple) {
        var that = this;
        if (typeof element === 'string') {
            element = that.getElement(element);
        }
        if (!multiple) {
            that.unactiveElements([element.id]);
        }
        if (element && !that.isElementActive(element.id)) {
            that.activedElements[element.id] = element;
            element.active(element.isNode);
            that.callCallback('onActiveElement', [element]);
        }
    };

    /**
     * Unactive element
     * @param {FlowChartElement|string} [element]
     */
    FlowChart.prototype.unactiveElement = function(element) {
        var that = this;
        if (typeof element === 'string') {
            element = that.getElement(element);
        }
        if (element) {
            delete this.activedElements[element.id];
            element.unactive();
            that.callCallback('onUnactiveElement', [element]);
        }
    };

    /**
     * Unactive elements
     */
    FlowChart.prototype.unactiveElements = function(excludeList) {
        var that = this;
        var excludeMap;
        if (excludeList) {
            if (typeof excludeList === 'string') {
                excludeList = excludeList.split(',');
            }
            excludeMap = {};
            excludeList.forEach(function(item) {
                if (typeof item === 'object') {
                    excludeMap[item.id] = 1;
                } else {
                    excludeMap[item] = 1;
                }
            });
        }
        $.each(that.activedElements, function(elementID, element) {
            if (excludeMap && excludeMap[elementID]) {
                return;
            }
            that.unactiveElement(element);
        });
        that.blurElementText();
    };

    /**
     * Check whether the given element is actived
     */
    FlowChart.prototype.isElementActive = function(elementID) {
        if (typeof elementID === 'object') {
            elementID = elementID.id;
        }
        return !!this.activedElements[elementID];
    };

    FlowChart.prototype.blurElementText = function() {
        var that = this;
        if (that._focusedElement) {
            var focusedElement = that.getElement(that._focusedElement);
            if (focusedElement) {
                focusedElement.blurText();
            }
            that._focusedElement = null;
        }
    };

    FlowChart.prototype.focusElementText = function(element) {
        var that = this;
        if (typeof element === 'string') {
            element = that.getElement(element);
        }
        if (!element) {
            return;
        }

        that.blurElementText();
        that.activeElement(element);
        element.focusText();
        that._focusedElement = element.id;
    };

    // Show contextmenu
    FlowChart.prototype.showContextMenu = function(ele, event) {
        var that = this;
        if (typeof ele === 'string') {
            ele = that.getElement(ele);
        }
        if (!ele) {
            return;
        }
        var items = [];
        if (!that.options.readonly) {
            var typeOptions = [];
            $.each(that.types, function(name, typeInfo) {
                if ((typeInfo.isNode === ele.isNode) && !typeInfo.internal) {
                    typeOptions.push('<option' + (ele.type === name ? ' selected' : '') + ' value="' + name + '">' + (typeInfo.displayName || typeInfo.name) + '</option>');
                }
            });
            items.push({
                id: 'type',
                html: [
                    '<div class="input-group" style="margin: 5px 10px 0 10px; min-width: 170px">',
                        '<span class="input-group-addon">' + that.lang.type + '</span>',
                        '<select class="form-control flowchart-' + that.id + '-type-selector" data-id="' + ele.id + '">',
                        typeOptions.join(''),
                        '</div>',
                    '</div>'
                ].join(''),
            }, '-');
            items.push({
                id: 'edit',
                label: that.lang.edit,
                onClick: function() {
                    that.focusElementText(ele);
                },
            }, {
                id: 'delete',
                label: that.lang.delete,
                onClick: function() {
                    if (!that.options.deleteConfirm || confirm(that.lang.confirmToDelete.format(ele.text || ele.id))) {
                        that.delete(ele.id);
                    }
                }
            });
        }
        if (typeof that.options.showContextMenu === 'function') {
            items = that.options.showContextMenu(ele, items, event);
        }
        if (items && items.length) {
            that.activeElement(ele);
            $.zui.ContextMenu.show(items, {event: event, className: 'flowchart-contextmenu'});
            return true;
        }
    };

    /**
     * Call function for each element
     * @param {Function} [callback]
     */
    FlowChart.prototype._forEachElement = function(callback) {
        $.each(this.elements, function(id, element) {
            callback(element, id);
        });
    };

    /**
     * Get partial render map
     * @param {{string[]|string}} [partialIDList]
     */
    FlowChart.prototype._getPartialRenderMap = function(partialIDList) {
        if (partialIDList && !$.isArray(partialIDList)) {
            partialIDList = [partialIDList];
        }
        var enabled = partialIDList && partialIDList.length;
        var map = null;
        var that = this;
        if (enabled) {
            map = {};
            partialIDList.forEach(function(elementID) {
                if (typeof elementID === 'object') {
                    elementID = elementID.id;
                }
                var element = that.getElement(elementID);
                if (element) {
                    map[elementID] = element;
                    if (element.isNode) {
                        var addRelToPartialMap = function(rel) {
                            map[rel.id] = rel;
                        };
                        var addRel = function(rel) {
                            addRelToPartialMap(rel);
                        };
                        if (element.fromRels.length) {
                            element.fromRels.forEach(addRel);
                        }
                        if (element.toRels.length) {
                            element.toRels.forEach(addRel);
                        }
                    }  else {
                        if (element.fromNode) {
                            map[element.fromNode.id] = element.fromNode;
                        }
                        if (element.toNode) {
                            map[element.toNode.id] = element.toNode;
                        }
                    }
                }
            });
        }
        return {
            map: map,
            /**
             * @type {boolean}
             */
            enabled: enabled,
            /**
             * @param {string} elementID
             * @return {boolean}
             */
            canSkip: function(elementID) {
                return enabled && !map[elementID];
            }
        };
    };

    FlowChart.prototype.initArrowMarker = function(arrowSize, arrowColor, inverse) {
        var $svgMarkers = this.$svgMarkers;
        var arrowID = 'flowchart-arrow-marker-' + arrowSize + '_' + $.zui.strCode(arrowColor) + (inverse ? '_inverse' : '');
        var $arrowMarker = $svgMarkers.find('#' + arrowID);
        if (!$arrowMarker.length) {
            var pathCode, refX, refY;
            if (inverse) {
                pathCode = 'M0,' + (arrowSize / 2) + ' L0,' + arrowSize + ' L' + arrowSize + ',' + arrowSize + ' z';
                refX = 0;
                refY = arrowSize / 2;
                ref = ' refx="' + arrowSize + '" refY="' + (arrowSize / 2) + '"';
            } else {
                pathCode = 'M0,0 L0,' + arrowSize + ' L' + arrowSize + ',' + (arrowSize / 2) + ' z';
                refX = arrowSize;
                refY = arrowSize / 2;
            }
            var marker = createSVGElement('marker', {
                id: arrowID,
                orient: 'auto',
                markerUnits: 'strokeWidth',
                refX: refX,
                refY: refY,
                markerWidth: arrowSize,
                markerHeight: arrowSize,
            });
            marker.appendChild(createSVGElement('path', {
                d: pathCode,
                fill: arrowColor
            }));
            $svgMarkers.append(marker);
        }
        return arrowID;
    };

    FlowChart.prototype._initElementsRelation = function() {
        /**
         * @type {FlowChartElement[]}
         */
        var nodeList     = [];

        /**
         * @type {FlowChartElement[]}
         */
        var relationList = [];

        this._forEachElement(function(element) {
            element.initBeforeRender();
            (element.isRelation ? relationList : nodeList).push(element);
        });

        /**
         * @type {FlowChartElement[]}
         */
        this.nodeList = FlowChartElement.sort(nodeList);

        /**
         * @type {FlowChartElement[]}
         */
        this.relationList = FlowChartElement.sort(relationList);

        relationList.forEach(function(relation) {
            relation.initRelationBeforeRender();
        });
    };

    /**
     * Render elements and relations
     * @param {string[]|string} [partialIDList]
     */
    FlowChart.prototype.render = function(partialIDList) {
        var that             = this;
        var options          = that.options;
        var partialRenderMap = that._getPartialRenderMap(partialIDList);

        if (!partialRenderMap.enabled) {
            that._initElementsRelation();
            that.bounds = {left: options.padding, top: options.padding, width: 0, height: 0};
        }

        var nodeList           = that.nodeList;
        var relationList       = that.relationList;
        var autoLayoutNodeList = [];
        var reLayoutNodeList   = [];
        nodeList.forEach(function(node) {
            if (partialRenderMap.canSkip(node.id)) {
                return;
            }
            node.renderNode(true);
            if (!node.getBounds().hasPosition && (!node.position || !node.position.custom)) {
                delete node._depth;
                delete node._depthSize;
                delete node._siblingIndex;
                autoLayoutNodeList.push(node);
            }
            reLayoutNodeList.push(node);
        });

        // Auto layout
        if (autoLayoutNodeList.length) {
            var depthsMap = [];
            var isHorzLayout = options.autoLayoutDirection === 'horz';
            var spaceSize = options[isHorzLayout ? 'vertSpace' : 'vertSpace'];
            var nodeSize = isHorzLayout ? (options.nodeMinWidth + options.nodeMaxWidth) / 2 : options.nodeHeight;
            var maxDepthSize = 0;
            var endDepthNodes = [];
            for (var i = 0; i < autoLayoutNodeList.length; ++i) {
                var node = autoLayoutNodeList[i];
                if (node.elementType.endType) {
                    endDepthNodes.push(node);
                    continue;
                }
                var depth = node.getDepth();
                var depthSize = node.getDeptSize(isHorzLayout, spaceSize);
                var depthInfo = depthsMap[depth];
                if (!depthInfo) {
                    depthInfo = {
                        list: [node],
                        size: depthSize,
                    };
                    depthsMap[depth] = depthInfo;
                } else {
                    depthInfo.list.push(node);
                    depthInfo.size += depthSize;
                }
                maxDepthSize = Math.max(maxDepthSize, depthSize);
            }
            for (var i = 0; i < endDepthNodes.length; ++i) {
                var node = endDepthNodes[i];
                var depth = depthsMap.length;
                node._depth = depth;
                var nodeBounds = node.getBounds();
                var depthSize = isHorzLayout ? nodeBounds.height : nodeBounds.width;
                var depthInfo = depthsMap[depth];
                if (!depthInfo) {
                    depthInfo = {
                        list: [node],
                        size: depthSize,
                    };
                    depthsMap[depth] = depthInfo;
                } else {
                    depthInfo.list.push(node);
                    depthInfo.size += depthSize;
                }
                maxDepthSize = Math.max(maxDepthSize, depthSize);
            }
            for (var depth = 0; depth < depthsMap.length; ++depth) {
                var depthInfo = depthsMap[depth];
                var padding = (maxDepthSize - depthInfo.size) / 2;
                var prevNodeSize = options.padding + padding;
                for (var i = 0; i < depthInfo.list.length; ++i) {
                    var node = depthInfo.list[i];
                    var depthSize = node.getDeptSize(isHorzLayout);
                    var nodeBounds = node.getBounds();
                    var position;
                    if (isHorzLayout) {
                        position = {
                            left: options.padding + depth * (spaceSize + nodeSize),
                            top: prevNodeSize + (depthSize - nodeBounds.height) / 2,
                        };
                    } else {
                        position = {
                            top: options.padding + depth * (spaceSize + nodeSize),
                            left: prevNodeSize + (depthSize - nodeBounds.width) / 2,
                        };
                    }
                    prevNodeSize += depthSize + spaceSize;
                    node.setBounds(position);
                }
            }

            // Handle overlay
            var needCheckOverlay = true;
            while(needCheckOverlay) {
                needCheckOverlay = false;
                for (var i = autoLayoutNodeList.length - 1; i >= 0; --i) {
                    var nodeA = autoLayoutNodeList[i];
                    for (var j = autoLayoutNodeList.length - 1; j >= 0; --j) {
                        if (i <= j) {
                            continue;
                        }
                        var nodeB = autoLayoutNodeList[j];
                        if (nodeA.isIntersectWith(nodeB)) {
                            needCheckOverlay = true;
                            nodeA.setBounds(isHorzLayout ? {
                                top: nodeA.getPosition().top + options.vertSpace + nodeA.getSize().height
                            } : {
                                left: nodeA.getPosition().left + options.horzSpace + nodeA.getSize().width
                            });
                        }
                    }
                }
            };
        }
        reLayoutNodeList.forEach(function(node) {
            node.layoutNode();
        });

        relationList.forEach(function(relation) {
            if (partialRenderMap.canSkip(relation.id)) {
                return;
            }
            relation.renderRelation();
        });

        var width = Math.max(that.$container.width(), that.bounds.width + options.padding);
        var height = Math.max(that.$container.height(), that.bounds.height + options.padding);
        that.$canvas.css({
            minWidth: width,
            minHeight: height,
        });
        that.$svg.attr({
            width: width,
            height: height,
        });
    };

    /**
     * Draw relation line between two points
     * @param {string} id
     * @param {{left: number, top: number, side: 'top'|'right'|'bottom'|'left', arrow: boolean}} beginPoint
     * @param {{left: number, top: number, side: 'top'|'right'|'bottom'|'left', arrow: boolean}} endPoint
     * @param {{style: 'solid'|'dashed'|'dotted', width: number, color: string, shape: 'polyline'|'straight'|'curve'|'bessel', canvasWidth: number, canvasHeight: number, bounds: {left: number, top: number, width: number, height: number, shape: object}}} style
     * @param {JQuery} [$text]
     */
    FlowChart.prototype.drawRelationLine = function(id, beginPoint, endPoint, style, $ele, $text) {
        var that = this;
        var centerLeft = Math.floor((beginPoint.left + endPoint.left) / 2);
        var centerTop = Math.floor((beginPoint.top + endPoint.top) / 2);
        var centerOffsetLeft = Math.floor((beginPoint.offsetLeft + endPoint.offsetLeft) / 2);
        var centerOffsetTop = Math.floor((beginPoint.offsetTop + endPoint.offsetTop) / 2);
        var lineWidth = style.width;
        var strokeDasharray;
        if (style.style === 'dashed') {
            strokeDasharray = (lineWidth * 4) + ' ' + (lineWidth * 2);
        } else if (style.style === 'dotted') {
            strokeDasharray = lineWidth + ' ' + lineWidth;
        } else {
            strokeDasharray = '';
        }
        var pathD = [];
        var pathAttrs = {
            id: id + '-path',
            'stroke-width': lineWidth,
            stroke: style.color,
            'stroke-dasharray': null,
            'marker-start': null,
            'marker-end': null,
            fill: 'transparent'
        };
        if (strokeDasharray) {
            pathAttrs['stroke-dasharray'] = strokeDasharray;
        }
        if (beginPoint.arrow) {
            pathAttrs['marker-start'] = 'url(#' + that.initArrowMarker(beginPoint.arrow, style.color, true) + ')';
        }
        if (endPoint.arrow) {
            pathAttrs['marker-end'] = 'url(#' + that.initArrowMarker(endPoint.arrow, style.color, false) + ')';
        }
        var $svg = that.$svg.find('#' + id);
        if ($svg.length) {
            updateSVGElement($svg[0], {
                'class': style.className,
                'data-id': style.relation.id,
                id: id,
            });
        } else {
            var svg = createSVGElement('g', {
                'class': style.className,
                'data-id': style.relation.id,
                id: id,
            });
            that.$svg.append(svg);
            $svg = that.$svg.find('#' + id);
        }
        if (style.shape === 'polyline') {
            var boundsWidth = Math.abs(beginPoint.left - endPoint.left);
            var boundsHeight = Math.abs(beginPoint.top - endPoint.top);
            // polyline offset ratio (-1 ~ 1)
            var boundsShape = $.extend({porX: 0, porY: 0}, style.bounds ? style.bounds.shape : null);
            var ctrlPoint = {
                x: Math.floor(centerLeft + Math.min(1, Math.max(-1, boundsShape.porX)) * boundsWidth / 2),
                y: Math.floor(centerTop + Math.min(1, Math.max(-1, boundsShape.porY)) * boundsHeight / 2),
            };
            if (boundsShape.porX || boundsShape.porY) {
                style.relation.setBounds({
                    shape: boundsShape
                });
            }
            pathD.push(
                'M',
                beginPoint.left,
                beginPoint.top,
                'L',
                (beginPoint.side === 'left' || beginPoint.side === 'right') ? ctrlPoint.x : beginPoint.left,
                (beginPoint.side === 'top' || beginPoint.side === 'bottom') ? ctrlPoint.y : beginPoint.top,
                'L',
                ctrlPoint.x,
                ctrlPoint.y,
                'L',
                (endPoint.side === 'left' || endPoint.side === 'right') ? ctrlPoint.x : endPoint.left,
                (endPoint.side === 'top' || endPoint.side === 'bottom') ? ctrlPoint.y : endPoint.top,
                ',',
                endPoint.left,
                endPoint.top,
            );
            centerOffsetLeft += ctrlPoint.x - centerLeft;
            centerOffsetTop += ctrlPoint.y - centerTop;
            var pointID = id + '-point-por';
            var $point = $svg.find('#' + pointID);
            style.relation.position.porx = boundsWidth / 2;
            style.relation.position.pory = boundsHeight / 2;
            var pointAttrs = {
                id: pointID,
                'class': 'flowchart-relation-line-ctrl-point flowchart-relation-primary-ctrl-point',
                'data-name': 'por',
                'data-id': style.relation.id,
                cx: ctrlPoint.x,
                cy: ctrlPoint.y,
                r: lineWidth * 3,
                'stroke-width': lineWidth * 2,
                stroke: style.activeColor,
                fill: 'transparent'
            };
            if ($point.length) {
                updateSVGElement($point[0], pointAttrs);
            } else {
                $point = createSVGElement('circle', pointAttrs);
                $svg.append($point);
            }
        } else if (style.shape === 'straight') {
            pathD.push(
                'M',
                beginPoint.left,
                beginPoint.top,
                'L',
                endPoint.left,
                endPoint.top,
            );
        } else if (style.shape === 'bessel') {
            var besselCurvature = ifUndefinedThen(style.shapeStyle.besselCurvature, that.options.besselCurvature);
            var boundWidth = Math.abs(beginPoint.left - endPoint.left);
            var boundHeight = Math.abs(beginPoint.top - endPoint.top);
            var bbX = Math.floor(beginPoint.side === 'right' ? (beginPoint.left + (boundWidth * besselCurvature / 2)) : (beginPoint.side === 'left' ? (beginPoint.left - (boundWidth * besselCurvature / 2)) : beginPoint.left));
            var bbY = Math.floor(beginPoint.side === 'top' ? (beginPoint.top - (boundHeight * besselCurvature / 2)) : (beginPoint.side === 'bottom' ? (beginPoint.top + (boundHeight * besselCurvature / 2)) : beginPoint.top));
            var bcX = centerLeft;
            var bcY = centerTop;
            var beX = Math.floor(endPoint.side === 'right' ? (endPoint.left + (boundWidth * besselCurvature / 2)) : (endPoint.side === 'left' ? (endPoint.left - (boundWidth * besselCurvature / 2)) : endPoint.left));
            var beY = Math.floor(endPoint.side === 'top' ? (endPoint.top - (boundHeight * besselCurvature / 2)) : (endPoint.side === 'bottom' ? (endPoint.top + (boundHeight * besselCurvature / 2)) : endPoint.top));
            var boundsShape = $.extend({
                bboX: 0, bboY: 0, bcoX: 0, bcoY: 0, beoX: 0, beoY: 0
            }, style.bounds ? style.bounds.shape : null);
            var controlPoints = {
                b: {x: bbX + boundsShape.bboX, y: bbY + boundsShape.bboY},
                c: {x: bcX + boundsShape.bcoX, y: bcY + boundsShape.bcoY},
                e: {x: beX + boundsShape.beoX, y: beY + boundsShape.beoY},
            };
            style.relation.setBounds({
                shape: boundsShape
            });
            pathD.push(
                'M',
                beginPoint.left,
                beginPoint.top,
                'Q',
                controlPoints.b.x,
                controlPoints.b.y,
                ',',
                controlPoints.c.x,
                controlPoints.c.y,
                'Q',
                controlPoints.e.x,
                controlPoints.e.y,
                ',',
                endPoint.left,
                endPoint.top,
            );
            centerOffsetLeft += controlPoints.c.x - bcX;
            centerOffsetTop += controlPoints.c.y - bcY;
            $.each(controlPoints, function(pointName) {
                var point = controlPoints[pointName];
                var pointID = id + '-point-' + pointName;
                var $point = $svg.find('#' + pointID);
                var pointAttrs = {
                    id: pointID,
                    'class': 'flowchart-relation-line-ctrl-point' + (pointName === 'c' ? ' flowchart-relation-primary-ctrl-point' : ''),
                    'data-name': pointName,
                    'data-id': style.relation.id,
                    // 'data-x': point.x,
                    // 'data-y': point.y,
                    cx: point.x,
                    cy: point.y,
                    r: lineWidth * 3,
                    'stroke-width': lineWidth * 2,
                    stroke: style.activeColor,
                    fill: 'transparent'
                };
                if ($point.length) {
                    updateSVGElement($point[0], pointAttrs);
                } else {
                    $point = createSVGElement('circle', pointAttrs);
                    $svg.append($point);
                }
            });
        } else if (style.shape === 'besselArc') {
            var besselCurvature = ifUndefinedThen(style.shapeStyle.besselCurvature, that.options.besselCurvature);
            var boundWidth = Math.abs(beginPoint.left - endPoint.left);
            var boundHeight = Math.abs(beginPoint.top - endPoint.top);
            var bbX = Math.floor(beginPoint.side === 'right' ? (beginPoint.left + (boundWidth * besselCurvature / 2)) : (beginPoint.side === 'left' ? (beginPoint.left - (boundWidth * besselCurvature / 2)) : beginPoint.left));
            var bbY = Math.floor(beginPoint.side === 'top' ? (beginPoint.top - (boundHeight * besselCurvature / 2)) : (beginPoint.side === 'bottom' ? (beginPoint.top + (boundHeight * besselCurvature / 2)) : beginPoint.top));
            var bcX = centerLeft;
            var bcY = centerTop;
            var beX = Math.floor(endPoint.side === 'right' ? (endPoint.left + (boundWidth * besselCurvature / 2)) : (endPoint.side === 'left' ? (endPoint.left - (boundWidth * besselCurvature / 2)) : endPoint.left));
            var beY = Math.floor(endPoint.side === 'top' ? (endPoint.top - (boundHeight * besselCurvature / 2)) : (endPoint.side === 'bottom' ? (endPoint.top + (boundHeight * besselCurvature / 2)) : endPoint.top));
            var boundsShape = $.extend({
                bboX: 0, bboY: 0, bcoX: 0, bcoY: 0, beoX: 0, beoY: 0
            }, style.bounds ? style.bounds.shape : null);
            var controlPoints = {
                b: {x: bbX + boundsShape.bboX, y: bbY + boundsShape.bboY},
                c: {x: bcX + boundsShape.bcoX, y: bcY + boundsShape.bcoY},
                e: {x: beX + boundsShape.beoX, y: beY + boundsShape.beoY},
            };
            style.relation.setBounds({
                shape: boundsShape
            });
            pathD.push(
                'M',
                beginPoint.left,
                beginPoint.top,
                'Q',
                controlPoints.b.x,
                controlPoints.b.y,
                ',',
                controlPoints.c.x,
                controlPoints.c.y,
                'Q',
                controlPoints.e.x,
                controlPoints.e.y,
                ',',
                endPoint.left,
                endPoint.top,
            );
            centerOffsetLeft += controlPoints.c.x - bcX;
            centerOffsetTop += controlPoints.c.y - bcY;
            $.each(controlPoints, function(pointName) {
                var point = controlPoints[pointName];
                var pointID = id + '-point-' + pointName;
                var $point = $svg.find('#' + pointID);
                var pointAttrs = {
                    id: pointID,
                    'class': 'flowchart-relation-line-ctrl-point' + (pointName === 'c' ? ' flowchart-relation-primary-ctrl-point' : ''),
                    'data-name': pointName,
                    'data-id': style.relation.id,
                    // 'data-x': point.x,
                    // 'data-y': point.y,
                    cx: point.x,
                    cy: point.y,
                    r: lineWidth * 3,
                    'stroke-width': lineWidth * 2,
                    stroke: style.activeColor,
                    fill: 'transparent'
                };
                if ($point.length) {
                    updateSVGElement($point[0], pointAttrs);
                } else {
                    $point = createSVGElement('circle', pointAttrs);
                    $svg.append($point);
                }
            });
        } else if (style.shape === 'arc') {
            var boundsWidth = Math.abs(beginPoint.left - endPoint.left);
            var boundsHeight = Math.abs(beginPoint.top - endPoint.top);
            var arcDiameter = distanceOfTwoPoints(beginPoint, endPoint);
            var radius = Math.floor(arcDiameter / 2);
            var boundsShape = $.extend({arrX: 0, arrY: 0}, style.bounds ? style.bounds.shape : null);
            var arcDirection = boundsWidth > boundsHeight ? 'y' : 'x';
            var getTopOfMiddleLine = function(left) {
                // 使用中垂线公式（y = (x (x1 - x2))/(y2 - y1) + ((x1 + x2) (x1 - x2))/(2 y2 - 2 y1) + (y1 + y2)/2）计算新的圆心坐标
                return left * (beginPoint.left-endPoint.left)/(endPoint.top-beginPoint.top)+(endPoint.left-beginPoint.left)/(endPoint.top-beginPoint.top)*(beginPoint.left+endPoint.left)/2+(beginPoint.top+endPoint.top)/2;
            };
            var getLeftOfMiddleLine = function(top) {
                return (top - (endPoint.left-beginPoint.left)/(endPoint.top-beginPoint.top)*(beginPoint.left+endPoint.left)/2 - (beginPoint.top+endPoint.top)/2) * (endPoint.top-beginPoint.top) / (beginPoint.left-endPoint.left);
            };
            var ctrlPoint = {
                left: centerLeft,
                top: centerTop
            };
            if (boundsShape.arrX || boundsShape.arrY) {
                if (arcDirection === 'x') {
                    ctrlPoint.left += boundsShape.arrX * arcDiameter;
                    ctrlPoint.top = getTopOfMiddleLine(ctrlPoint.left);
                } else {
                    ctrlPoint.top += boundsShape.arrY * arcDiameter;
                    ctrlPoint.left = getLeftOfMiddleLine(ctrlPoint.top);
                }
                radius = distanceOfTwoPoints(ctrlPoint, beginPoint);
            }
            pathD.push(
                'M',
                beginPoint.left,
                beginPoint.top,
                'A',
                radius,
                radius,
                0,
                1,
                boundsShape[arcDirection === 'x' ? 'arrX' : 'arrY'] * (arcDirection === 'y' ? (-1) : 1) >= 0 ? 1 : 0,
                endPoint.left,
                endPoint.top,
            );
            centerOffsetLeft += ctrlPoint.left - centerLeft;
            centerOffsetTop += ctrlPoint.top - centerTop;
            var pointID = id + '-point-arr';
            var $point = $svg.find('#' + pointID);
            style.relation.position.arcd = arcDiameter;
            style.relation.position.acdd = arcDirection;
            var pointAttrs = {
                id: pointID,
                'class': 'flowchart-relation-line-ctrl-point flowchart-relation-primary-ctrl-point',
                'data-name': 'arr',
                'data-id': style.relation.id,
                cx: ctrlPoint.left,
                cy: ctrlPoint.top,
                r: lineWidth * 3,
                'stroke-width': lineWidth * 2,
                stroke: style.activeColor,
                fill: 'transparent'
            };
            if ($point.length) {
                updateSVGElement($point[0], pointAttrs);
            } else {
                $point = createSVGElement('circle', pointAttrs);
                $svg.append($point);
            }
        }
        pathAttrs.d = pathD.join(' ');
        var $line = $svg.find('#' + pathAttrs.id);
        if ($line.length) {
            updateSVGElement($line[0], pathAttrs);
        } else {
            var line = createSVGElement('path', pathAttrs);
            $svg.append(line);
        }
        if ($text) {
            $text.css({
                left: Math.floor(centerOffsetLeft - $text.outerWidth() / 2),
                top: Math.floor(centerOffsetTop - $text.outerHeight() / 2),
            });
        }
    };

    /**
     * Set node position
     * @param {string} elementID
     * @param {object} position
     * @param {boolean} [skipRender]
     * @param {{left: number, top: number, custom?: boolean}} position
     */
    FlowChart.prototype.setElementBounds = function(elementID, position, skipRender) {
        var that = this;
        var element = that.getElement(elementID);
        if (!element) {
            return;
        }
        element.setBounds(position);
        if (!skipRender) {
            that.render(element);
        }
    };

    FlowChart.prototype.addElement = function(elementData) {
        var newElements = this.update(elementData);
        if (newElements && newElements.length) {
            this.focusElementText(newElements[0].id);
        }
        return newElements;
    };

    FlowChart.prototype.addNode = function(type, fromNode, fromPort, text, direction) {
        if (typeof fromNode === 'string') {
            fromNode = this.getElement(fromNode);
        }
        if (!fromNode) {
            return;
        }
        var from = fromNode.id;
        if (typeof fromPort === 'string' && fromPort.length) {
            from += '.' + fromPort;
        }
        var position;
        if (direction) {
            position = {
                direction: direction,
                from: fromNode.id
            };
        }
        return this.addElement({
            type: type,
            from: from,
            text: text === undefined ? null : text,
            position: position,
        });
    };

    // Add relation between two nodes
    FlowChart.prototype.addRelation = function(fromNode, fromPort, toNode, toPort, text, type) {
        var that = this;

        if (typeof fromNode === 'string') {
            fromNode = that.getElement(fromNode);
        }
        if (typeof toNode === 'string') {
            toNode = that.getElement(toNode);
        }
        if (!fromNode || !toNode || fromNode === toNode) {
            return;
        }

        if (!that.options.allowFreePorts && (!fromPort || !toPort)) {
            return;
        }

        return that.addElement(that.createRelation({
            text: text === undefined ? null : text,
            from: fromNode.id,
            fromPort: fromPort,
            to: toNode.id,
            toPort: toPort,
            type: type
        }));
    };

    // Reset all custom positions
    FlowChart.prototype.resetPosition = function() {
        $.each(this.elements, function(_, element) {
            if (element.type !== 'relation' && element.customPos) {
                delete element.customPos;
            }
        });
        this.render();
    };

    // Get element by id
    FlowChart.prototype.getElement = function(elementID) {
        if (!elementID) {
            return null;
        }
        if (typeof elementID !== 'string') {
            elementID = elementID.id;
        }
        return this.elements[elementID];
    };

    FlowChart.prototype.setElementText = function(element, text, skipRender) {
        var that = this;
        if (typeof element === 'string') {
            element = that.getElement(element);
        }
        if (!element) {
            return;
        }

        if (element.setText(text)) {
            this.update(element, skipRender);
        }
    };

    // Reset data
    FlowChart.prototype.resetData = function(data) {
        if (!data) {
            data = [{
                type: 'start',
            }];
        }
        var that = this;
        var oldElements = [];
        $.each(that.elements, function(_, ele) {
            oldElements.push(ele);
        });
        that.delete(oldElements, true, true);
        that.update(data, false, true);
        that.callCallback('onResetData', [data]);
    };

    // Update elements data
    FlowChart.prototype.update = function(elementsData, skipRender, silence) {
        if (typeof elementsData === 'object' && !$.isArray(elementsData)) {
            elementsData = [elementsData];
        }
        var that = this;
        var elementsToUpdate = [];
        if (elementsData && elementsData.length) {
            var elements = that.elements;
            $.each(elementsData, function(_, element) {
                var newElements = that.createElements(element);
                newElements.forEach(function(newElement) {
                    var oldElement = elements[newElement.id];
                    if (!oldElement) {
                        newElement.isNew = true;
                    } else if (oldElement !== newElement) {
                        newElement.order = oldElement.order;
                        if (!newElement.hasPosition()) {
                            newElement.setPosition(oldElement.getPosition());
                        }
                    }

                    elementsToUpdate.push(newElement);
                });
            });

            if (!silence) {
                var result = that.callCallback('onUpdateElement', [elementsToUpdate]);
                if (result === false) {
                    return;
                }
                if ($.isArray(result)) {
                    elementsToUpdate = result;
                }

                var elementsToAdd = [];
                elementsToUpdate.forEach(function(newElement) {
                    if (newElement.isNew) {
                        elementsToAdd.push(newElement);
                    }
                });
                if (elementsToAdd.length) {
                    var addResult = that.callCallback('onAddElement', [elementsToAdd]);
                    if (addResult === false) {
                        return;
                    }
                    if ($.isArray(addResult)) {
                        const elementsToAddMap = {};
                        addResult.forEach(function(newElement) {
                            elementsToAddMap[newElement.id] = newElement;
                        });
                        const newElements = [];
                        elementsToUpdate.forEach(function(newElement) {
                            if (newElement.isNew) {
                                if (elementsToAddMap[newElement.id]) {
                                    newElements.push(elementsToAddMap[newElement.id]);
                                }
                            } else {
                                newElements.push(newElement);
                            }
                        });
                        elementsToUpdate = newElements;
                    }
                }
            }
            elementsToUpdate.forEach(function(newElement) {
                delete newElement.isNew;
                elements[newElement.id] = newElement;
            });
        }

        that._initElementsRelation();

        if (!skipRender) {
            that.render(silence ? null : elementsToUpdate);
        }

        return elementsToUpdate;
    };

    // Replace element with a new one
    FlowChart.prototype.replace = function(oldElementID, newElement, skipRender) {
        if (typeof oldElementID !== 'string') {
            oldElementID = oldElementID.id;
        }
        var that = this;

        var newElements = that.createElements(newElement);
        newElement = newElements[0];
        var oldElement = that.getElement(oldElementID);
        if (oldElement) {
            that.delete(oldElementID, true);
        }
        $.each(that.elements, function(_, element) {
            if (element.isRelation) {
                if (element.from === oldElementID) {
                    element.from = newElement.id;
                } else if (element.to === oldElementID) {
                    element.to = newElement.id;
                }
            }
        });
        if (!skipRender) {
            that.render();
        }
    };

    /**
     * Get dom id of given element
     * @param {FlowChartElement|string} element
     * @param {boolean} [excludeCssPrefix]
     * @return {string}
     */
    FlowChart.prototype.getDomID = function(element, excludeCssPrefix) {
        if (typeof element === 'string') {
            return (excludeCssPrefix ? '' : '#') + this.id + '-' + element;
        }
        return (excludeCssPrefix ? '' : '#') + this.id + '-' + element.id;
    };

    /**
     * Find element and return jquery object
     * @param {string} elementID
     * @return {JQuery}
     */
    FlowChart.prototype.$findElement = function(elementID) {
        return this.$canvas.find(this.getDomID(elementID));
    };

    // Delete elements and relations
    FlowChart.prototype.delete = function(idList, skipRender, skipTriggerEvent) {
        var that = this;
        if (!$.isArray(idList)) {
            idList = [idList];
        }

        var deletedElements = [];
        $.each(idList, function(idx, id) {
            if (typeof id === 'object') {
                id = id.id;
            }
            that.$findElement(id).remove();
            var element = that.getElement(id);
            if (element) {
                deletedElements.push(element);
                if (element.isNode) {
                    // Delete relations
                    var deleteRelation = function(relation) {
                        that.delete(relation.id, true, true);
                    };
                    element.fromRels && element.fromRels.forEach(deleteRelation);
                    element.toRels && element.toRels.forEach(deleteRelation);
                } else {
                    if (element.relationLineID) {
                        $('#' + element.relationLineID).remove();
                    }
                    var fromNode = element.fromNode;
                    if (fromNode && fromNode.fromRels && fromNode.fromRels.length) {
                        var relIndex = fromNode.fromRels.findIndex(function(x) {return x.id === element.id});
                        if (relIndex > -1) {
                            fromNode.fromRels.splice(relIndex, 1);
                        }
                    }
                    var toNode = element.toNode;
                    if (toNode && toNode.toRels && toNode.toRels.length) {
                        var relIndex = toNode.toRels.findIndex(function(x) {return x.id === element.id});
                        if (relIndex > -1) {
                            toNode.toRels.splice(relIndex, 1);
                        }
                    }
                }
                delete that.elements[id];
                if (that._focusedElement === id) {
                    that._focusedElement = null;
                }
                if (that.activedElements[id]) {
                    delete that.activedElements[id];
                }
            }
        });

        if (deletedElements.length) {
            that._initElementsRelation();
            if (!skipRender) {
                that.render();
            }
            if (!skipTriggerEvent) {
                that.callCallback('onDeleteElement', [deletedElements]);
            }
        }
    };

    // Export chart data as elements list
    FlowChart.prototype.exportData = function() {
        var that = this;
        var exportDataToSelf = that.options.exportDataToSelf;
        var dataList = [];
        $.each(that.elements, function(_, element) {
            var itemData = element.exportData();
            if (exportDataToSelf && itemData.data) {
                $.extend(itemData, itemData.data);
                delete itemData.data;
            }
            dataList.push(itemData);
        });
        dataList.sort(function(e1, e2) {
            return e1.order - e2.order;
        });
        $.each(dataList, function(_, dataItem) {
            delete dataItem.order;
        });
        return dataList;
    };

    FlowChart.prototype.exportTypes = function(includeInternalTypes) {
        var that = this;
        var typesList = [];
        $.each(that.types, function(_, elementType) {
            if (!elementType.internal || includeInternalTypes) {
                typesList.push(elementType.exportType());
            }
        });
        return typesList;
    };

    // Change options
    FlowChart.prototype.setOptions = function(newOptions, skipRender) {
        $.extend(this.options, newOptions);
        if (!skipRender) {
            this.render();
        }
    };

    FlowChart.plugins = {};

    /**
     * Add plugin to flowchart
     * @param {string} pluginName
     * @param {{defaultOptions: Record<string, any>, plugins: string|string[]}}
     */
    FlowChart.addPlugin = function(pluginName, pluginConfig) {
        if (FlowChart.plugins[pluginName]) {
            throw new Error('FlowChart: Add flowchart plugin failed, because there is already a plugin named "' + pluginName + '".');
        }
        pluginConfig = $.extend(true, {}, pluginConfig);
        if (pluginConfig.plugins && typeof pluginConfig.plugins === 'string') {
            pluginConfig.plugins = pluginConfig.plugins.split(',');
        }
        FlowChart.plugins[pluginName] = pluginConfig;
    };

    FlowChart.LANGS = {
        'zh-cn': {
            confirmToDelete: "确定删除【{0}】？",
            edit: '编辑',
            'delete': '删除',
            'type': '类型',
            'selectRelationType': '请选择关系类型',
            'type.rectangle': '矩形',
            'type.box': '方框',
            'type.circle': '圆形',
            'type.diamond': '菱形',
            'type.dot': '点',
            'type.link': '连接线',
            'type.action': '动作',
            'type.start': '开始',
            'type.stop': '结束',
            'type.result': '结果',
            'type.relation': '关系',
            'type.judge': '判断',
            'type.connection': '连接',
            'type.point': '节点',
        },
        'zh-tw': {
            confirmToDelete: "確定刪除【{0}】？",
            edit: '編輯',
            'delete': '刪除',
            'type': '類型',
            'selectRelationType': '請選擇關係類型',
            'type.rectangle': '矩形',
            'type.box': '方框',
            'type.circle': '圓形',
            'type.diamond': '菱形',
            'type.dot': '點',
            'type.link': '連接線',
            'type.action': '動作',
            'type.start': '開始',
            'type.stop': '結束',
            'type.result': '結果',
            'type.relation': '關係',
            'type.judge': '判斷',
            'type.connection': '連接',
            'type.point': '節點',
        },
        en: {
            confirmToDelete: "Confirm to delete \"{0}\"?",
            edit: 'Edit',
            'delete': 'Delete',
            'type': 'Type',
            'selectRelationType': 'Please select relation type',
            'type.rectangle': 'Rectangle',
            'type.box': 'Box',
            'type.circle': 'Circle',
            'type.diamond': 'Diamond',
            'type.dot': 'Dot',
            'type.link': 'Link',
            'type.action': 'Action',
            'type.start': 'Start',
            'type.stop': 'Stop',
            'type.result': 'Result',
            'type.relation': 'Relation',
            'type.judge': 'Judge',
            'type.connection': 'Connection',
            'type.point': 'Point',
        },
    },

    // default options
    FlowChart.DEFAULTS = {
        // 当前语言，如果指定为 `null`，则自动设置语言
        lang: null,

        // 添加新的语言选项
        langs: null,

        // 激活状态颜色
        activeColor: '#3280fc',

        // 允许自由端口，是否支持添加关系连接线到节点自身而不指定端口
        allowFreePorts: false,

        // 是否移动时自动吸附网格
        // 如果设置为 true，则设置网格为 5，如果为数值则为指定的网格大小
        adsorptionGrid: 5,

        // 是否启用双击编辑功能
        doubleClickToEdit: true,

        // 是否启用只读模式, false, true, can-drag
        readonly: false,

        // 是否显示节点上下文菜单（右键菜单）
        // 此选项可以设置为一个函数动态返回自定义菜单项
        showContextMenu: true,

        // 通过拖放添加节点
        addFromDrop: true,

        // 是否允许拖拽来修改关系指向
        editRelationByDrag: true,

        // 是否启用快速添加功能，显示浮动的按钮快捷的向四个方向添加新的节点
        quickAdd: true,

        // 默认的节点类型
        defaultNodeType: 'action',

        // 默认的关系类型
        defaultRelationType: 'relation',

        // 删除节点前是否确认
        deleteConfirm: true,

        // 添加关系连接线时确认类型
        confirmRelationType: true,

        // 是否启用拖放移动功能
        draggable: true,

        // 是否将节点自定义数据导出为节点自身属性
        exportDataToSelf: true,

        // 画布宽度，如果设置为 `auto` 则宽度与外部容器元素宽度一致
        width: 'auto',

        // 画布高度
        height: 500,

        // 画布内边距
        padding: 20,

        // 节点背景色
        nodeBackground: '#fff',

        // 动作节点高度
        nodeHeight: 40,

        // 最小宽度
        nodeMinWidth: 70,

        // 最大宽度
        nodeMaxWidth: 200,

        // 自动布局时的方向
        autoLayoutDirection: 'vert',

        // 节点间的默认水平距离
        horzSpace: 80,

        // 节点间的默认垂直距离
        vertSpace: 60,

        // 连接线箭头大小
        relationArrowSize: 8,

        // 连接线宽度
        relationLineWidth: 1,

        // 连接线样式
        relationLineStyle: 'solid',

        // 连接线颜色
        relationLineColor: '#333',

        // 连接线形状
        relationLineShape: 'straight',

        // 贝塞尔曲线弯曲程度，0 ～ 1，值越大，弯曲度越大
        besselCurvature: 0.8,

        // 端口连接线长度
        portLineLength: 0,

        // 端口所占空间大小
        portSpaceSize: 20,

        // 端口线宽度，如果设置为 0 则不显示
        portLineWidth: 1,

        // 端口线样式
        portLineStyle: 'solid',

        // 端口线颜色
        portLineColor: '#333',

        // 关系连接线文本样式
        relationTextStyle: {
        },

        // 隐藏指向结果节点的关系箭头
        hideArrowToResult: true,

        // 节点基本样式
        nodeStyle: {
        },

        // 节点上的文本样式
        nodeTextStyle: {
        },

        // 是否将关系上的文本显示在连接线旁边而不是覆盖在连接线上
        // showRelationTextOnSide: false,

        activeOnClick: true,

        // 当点击元素时的回调函数 function(element, $element)
        onClickElement: null,

        // 	指定一个回调函数监听元素被取消激活状态时的操作
        onUnactiveElement: null,

        // 指定一个回调函数监听元素被激活时的操作
        onActiveElement: null,

        // 指定一个回调函数监听元素添加操作
        onDeleteElement: null,

        // 指定一个回调函数监听元素添加和修改
        onUpdateElement: null,

        // 指定一个回调函数监听元素添加
        onAddElement: null,

        // 指定一个回调函数在渲染节点时进行调用
        onRenderNode: null,

        // 指定一个回调函数监在重置关系图数据后调用
        onResetData: null,

        // 指定一个回调函数监在关系图创建完成后调用（初始化完成之后）
        afterCreate: null,

        // 	指定一个回调函数监在关系图创建之前调用（初始化完成但没有绘制）
        beforeCreate: null,

        // 节点元素模板字符串
        nodeTemplate: '<div id="{domID}" data-basic-type="{basicType}" data-type="{type}" style="position: absolute; z-index: {zIndex}; display: flex; justify-content: center; align-items: center; cursor: {cursor}" class="flowchart-element flowchart-element-{type} flowchart-node" data-id="{id}"><div class="flowchart-text flowchart-node-text" style="position: relative; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; z-index: 5; outline: none; min-width: 10px; min-height: 20px; text-align: center"></div></div>',

        // 关系元素模版字符串
        relationTemplate: '<div id="{domID}" data-basic-type="{basicType}" data-type="{type}" class="flowchart-element flowchart-element-{type} flowchart-relation" data-id="{id}" data-type="relation" style="position: absolute; z-index: 0;"><div class="flowchart-relation-lines" style="position:absolute;top:0;right:0;bottom:0;left:0;"></div><div class="flowchart-text flowchart-relation-text" style="background: rgba(255,255,255,.95); position: absolute; z-index: 5; line-height: 1; outline: none; white-space:nowrap; text-align: center"></div></div>',

        // 自定义元素类型
        elementTypes: {},

        // 是否包含默认节点类型
        initialTypes: true,

        // 初始数据
        data: [{
            id: 'start',
            type: 'start',
            text: 'Start',
            // className: 'text-red',
            // style: {color: 'red'}
        }, /*{
            id: 'action-example-1',
            type: 'action',
            text: '渲染图形'
        }, {
            id: 'action-example-2',
            type: 'action',
            text: '显示画面'
        }, {
            id: 'action-example-3',
            type: 'action',
            text: '额外运算'
        }, {
            id: 'action-example-4',
            type: 'stop',
            text: '完成'
        }, {
            type: 'relation',
            id: 'relation-1',
            from: 'start',
            to: 'action-example-1',
            text: '工作'
        }, {
            type: 'relation',
            id: 'relation-2',
            from: 'action-example-1',
            to: 'action-example-2',
        }, {
            type: 'relation',
            id: 'relation-3',
            from: 'action-example-2',
            to: 'action-example-4',
            text: '休息了'
        }, {
            type: 'relation',
            id: 'relation-4',
            from: 'action-example-1',
            to: 'action-example-3',
            text: '关系',
        }, {
            type: 'relation',
            id: 'relation-5',
            from: 'action-example-3',
            to: 'action-example-4',
            text: 'test',
        }, {
            type: 'relation',
            id: 'relation-6',
            from: 'action-example-2',
            to: 'action-example-3',
            text: 'test2'
        }*/],
    };

    // Extend jquery element
    $.fn.flowChart = function(option) {
        return this.each(function() {
            var $this = $(this);
            var data = $this.data(NAME);
            var options = typeof option == 'object' && option;

            if(!data) $this.data(NAME, (data = new FlowChart(this, options)));

            if(typeof option == 'string') data[option]();
        });
    };

    FlowChart.NAME = NAME;
    FlowChart.supportElementTypes = supportElementTypes;
    FlowChart.convertCssToSvgStyle = convertCssToSvgStyle;
    FlowChart.createSVGElement = createSVGElement;
    FlowChart.addTwoPoints = addTwoPoints;

    $.fn.flowChart.Constructor = FlowChart;

    $.zui({
        FlowChart: FlowChart,
        FlowChartElement: FlowChartElement
    });
}(jQuery, undefined, window, document));
