(function() {
var existed = function(groups, dot) {
		var i = 0;
		while(i < groups.length && !(groups[i].x === dot.x && groups[i].y === dot.y)) {
			i++;
		}
		return i;
	},
	color_value = function (value, total, s, b) {
		return "hsb(" + [Math.min((1 - value / total) * 0.4, 1), s || 0.9, b || 0.9] + ")";
	},
	create_array = function(min, max) {
		var a = [],
			i = 0;
		for(i=min;i<=max;i++) { a.push(i); }
		return a;
	};
Raphael.fn.polkadot = {
	plot: function(dots, options) {
		var fin = options.fin,
			fout = options.fout,
			fclick = options.fclick,
			maxA = Math.max.apply(null, dots.map(function(d){return d.size;})),
			maxX = (options.maxX!=null)? options.maxX : Math.max.apply(null, dots.map(function(d){return d.x;})),
			minX = (options.minX!=null)? options.minX : Math.min.apply(null, dots.map(function(d){return d.x;})),
			maxY = (options.maxY!=null)? options.maxY : Math.max.apply(null, dots.map(function(d){return d.y;})),
			minY = (options.minY!=null)? options.minY : Math.min.apply(null, dots.map(function(d){return d.y;})),
			settings = {xOffset: 15,
						yOffset: 30,
						xStep: options.xstep || 38,
						yStep: options.ystep || 50,
						maxX: maxX,
						minX: minX,
						maxY: maxY,
						minY: minY,
						xAxis: options.xAxis || create_array(minX,maxX),
						yAxis: options.yAxis || create_array(minY,maxY),
						maxR: options.maxR || 15,
						minR: options.minR || 2,
						topR: Math.sqrt(maxA/Math.PI),
						font: options.font || "10px verdana, arial, helvetica, sans-serif"
						},
			groups = [];

		this.polkadot.draw_axes(settings);
		
		//gather dots in unique (x,y) groups
		var i = 0, ii = dots.length, e = 0;
		for(i=0;i<ii;i++) {
			if(groups.length > 0 && (e=existed(groups, dots[i])) < groups.length) {
				groups[e].dots.push(dots[i]);
				groups[e].total += dots[i].size;
			}
			else {
				groups.push({x:dots[i].x, y:dots[i].y, total: dots[i].size, dots: [dots[i]]});
			}
		}
		
		ii = groups.length;
		for(i=0;i<ii;i++) { 
			if(groups[i].dots.length === 1) { //draw dots for single dot group
				this.polkadot.dot(groups[i].dots[0], settings, fin, fout, fclick);
			}
			else { //create a new group and then draw enclosing dots
				this.polkadot.group(groups[i], settings, fin, fout, fclick);
			}
		}
		
		this.width += 30;
	},
	
	draw_axes: function(settings) {
		var margin = 20,
			txt_height = 15,
			x = settings.xOffset,
			y = (settings.yAxis.length-1)*settings.yStep + settings.yOffset + margin + txt_height,
			i = 0,
			ii = settings.yAxis.length;
		for(i=0;i<ii;i++) {
			var ylabel = this.text(x, i*settings.yStep + settings.yOffset, settings.yAxis[settings.yAxis.length-1-i]).attr({font: settings.font});
			var w = x + ylabel.getBBox().width;
			if(w > settings.xOffset) {
				settings.xOffset = w;
			}
		}
		settings.xOffset += margin; //give some extra margin from the yAxis
		
		for(i=0, ii=settings.xAxis.length;i<ii;i++) {
			var xlabel = this.text(i*settings.xStep + settings.xOffset, y, settings.xAxis[i]).attr({font: settings.font});
		}
		//resize canvas to fit x-y axes scale (give 2*margin for x b/c the last x has 1/2r + expand)
		this.setSize((settings.xAxis.length-1)*settings.xStep + settings.xOffset + 2*margin, y + settings.yOffset);
	},
	
	polka_circle: function(dot, settings) {
		var x = (dot.x-settings.minX)*settings.xStep + settings.xOffset,
			y = (settings.maxY-dot.y)*settings.yStep + settings.yOffset,
			r = Math.max(Math.min(Math.sqrt(dot.size/Math.PI)/settings.topR * settings.maxR, settings.maxR), settings.minR),
			color = color_value(r, settings.maxR),		
			circle = this.circle(x, y, r).attr({fill: color, stroke: 'none'}),
			label = this.text(x, y, dot.size).attr({fill: "#fff", font: settings.font}).hide(),
			s = this.set().push(circle, label);
		return {x: x, y: y, r: r, color: color, label: label, circle: circle, set: s};
	},
	
	dot: function(dot, settings, fin, fout, fclick) {
		var d = this.polkadot.polka_circle(dot, settings);
		d.set.hover(function() {
			if(typeof(fin) !== 'undefined') {fin(dot, d);}
			else { d.label.show(); document.body.style.cursor="pointer"; }
		}, 
		function(){
			if(typeof(fout) !== 'undefined') {fout(dot, d);}
			else {d.label.hide();document.body.style.cursor="default";}
		});
		d.set.click(function() { if(typeof(fclick) !== 'undefined') { fclick(dot, d);}});
		return {set: d.set, circle: d.circle};
	},
	
	group: function(group, settings, fin, fout, fclick) {
		var subsets = [],
			cover = this.polkadot.polka_circle({x:group.x, y:group.y, size: group.total}, settings),
			container = this.set().push(cover.set),
			angle = 2*Math.PI/group.dots.length,
			duration = 300,
			easing = ">",
			mag = 20;
		
	
		//create sub dots with the same behavior as single-dot group (only they are hidden)
		var i = 0,
			ii = group.dots.length;
		for(i=0;i<ii;i++) {
			subsets[i] = this.polkadot.dot(group.dots[i], settings, fin, fout, fclick);
			container.push(subsets[i].set.hide()); //since container is a set containing sub dots so hovering over sub dots won't trigger container's mouseout
		}
		
		var expand = function() {
			//cover.circle.animate({r: 40, opacity:0.1}, duration, easing);
			cover.circle.attr({r: 40, opacity:0});
			var j=0, jj = subsets.length;
			for(j=0;j<jj;j++) {
				var theta = j * angle;
				subsets[j].set.animate({translation:[Math.cos(theta)*mag, Math.sin(theta)*mag]}, duration, easing);
				subsets[j].circle.show();
			}
		};
		
		var contract = function() {
			//cover.circle.animate({r: cover.r, opacity:1}, duration, easing);
			cover.circle.attr({r: cover.r, opacity:1});
			var j = 0, jj=subsets.length;
			for(j=0;j<jj;j++) {
				var theta = j * angle;
				subsets[j].set.animate({translation:[-Math.cos(theta)*mag, -Math.sin(theta)*mag]}, duration, easing);
				subsets[j].circle.hide();
			}
		};
		
		//hover event can only be added after all subsets are created
		container.hover(expand, contract);
	}
};
})();