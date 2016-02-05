(function(e,t){typeof define=="function"&&define.amd?define(["d3","../layout/Grid","./HipieDDL","../layout/Surface","../layout/Cell","../layout/Popup","../other/Persist"],t):e.marshaller_HTML=t(e.d3,e.layout_Grid,e.marshaller_HipieDDL,e.layout_Surface,e.layout_Cell,e.layout_Popup,e.other_Persist)})(this,function(e,t,n,r,i,s,o){function u(){t.call(this),this.surfacePadding(0),this.flyoutWidgets={}}function a(e,t){t instanceof Object||t&&(t=JSON.parse(t));var r=null,i={};return e.accept({visit:function(e){e instanceof n.Dashboard?(r={dashboard:e,visualizations:[]},i[e.getQualifiedID()]=r):e instanceof n.DataSource?e.databomb&&t[e.id]&&e.comms.databomb(t[e.id]):e instanceof n.Output?e.dataSource.databomb&&e.dataSource.comms.databombOutput(e.from):e instanceof n.Visualization&&e.widget&&r.visualizations.push(e)}}),i}return u.prototype=Object.create(t.prototype),u.prototype.constructor=u,u.prototype._class+=" marshaller_HTML",u.prototype.publish("ddlUrl","","string","DDL URL",null,{tags:["Private"]}),u.prototype.publish("databomb","","string","Data Bomb",null,{tags:["Private"]}),u.prototype.publish("proxyMappings",{},"object","Proxy Mappings",null,{tags:["Private"]}),u.prototype.enter=function(e,n){t.prototype.enter.apply(this,arguments),this.popupContainer=n.append("div").classed("popup-container",!0).style({height:"100px",position:"absolute","z-index":1e3})},u.prototype.render=function(i){function l(){var e=a(f.marshaller,f.databomb());if(f.marshaller.widgetMappings().empty()){var n={},o={};for(var u in e){var l=0,c=0,h=[],p=[];e[u].visualizations.forEach(function(e,t){e.properties.flyout?h.push(e):p.push(e)});var d=Math.floor(Math.sqrt(p.length));p.forEach(function(e,t){e.widget instanceof r||e.widget.classID()==="composite_MegaChart"?e.widgetSurface=e.widget:e.widgetSurface=(new r).widget(e.widget),t&&t%d===0&&(l++,c=0),e.widget.size({width:0,height:0}),e.widgetSurface.title(e.title),f.setContent(l,c,e.widgetSurface),n[e.id]=f.getWidgetCell(e.widgetSurface.id()),c++}),h.forEach(function(e,t){var i=f.flyoutWidgets[e.id]=(new s).size({width:400,height:400}).position("absolute").widget((new r).title(e.title).surfaceBackgroundColor("rgb(234, 249, 255)").widget(e.widget).buttonAnnotations([{id:"",label:"",width:20,padding:"0px 5px","class":"close",font:"FontAwesome"}]).on("click",function(e){e.class==="close"&&i.visible(!1).popupState(!1).render()})),u=e.events.getUpdatesVisualizations(),a=u.map(function(e){return n[e.id].id()});a.forEach(function(t){o[t]||(o[t]=[]),o[t].push(f.flyoutWidgets[e.id])})})}for(u in e)e[u].visualizations.forEach(function(e,t){if(e.properties.flyout)return;var r=e.events.getUpdatesVisualizations();if(Object.keys(o).indexOf(n[e.id].id())!==-1){var i=o[n[e.id].id()].map(function(t,n){return{id:"button_"+e.id+"_"+t.id()+"_"+n,label:"",width:20,padding:"0px 5px","class":"popup-flyout",font:"FontAwesome"}});n[e.id].widget().buttonAnnotations(i).on("click",function(t){if(t.class==="popup-flyout"){var r=t.id.split("_").pop(),i=o[n[e.id].id()][r];i.visible(!0).popupState(!0).render()}})}var s=r.map(function(e){return n[e.id].id()});n[e.id].indicateTheseIds(s)})}t.prototype.render.call(f,function(t){for(var n in t.flyoutWidgets){var r=t.flyoutWidgets[n];r.target(t.popupContainer.node()).render(function(e){e.top(document.documentElement.clientHeight/2-e._size.height/2).left(document.documentElement.clientWidth/2-e._size.width/2).visible(!1).popupState(!1).render()})}for(var s in e)for(var o in e[s].dashboard.datasources)e[s].dashboard.datasources[o].fetchData({},!0);i&&i(t)})}if(this.ddlUrl()===""||this.ddlUrl()===this._prev_ddlUrl&&this.databomb()===this._prev_databomb)return t.prototype.render.apply(this,arguments);this._prev_ddlUrl&&this._prev_ddlUrl!==this.ddlUrl()&&this.clearContent(),this._prev_ddlUrl=this.ddlUrl(),this._prev_databomb=this.databomb();var u=[];o.widgetArrayWalker(this.content(),function(e){u.push(e)});var f=this;return this.marshaller=(new n.Marshaller).proxyMappings(this.proxyMappings()).widgetMappings(e.map(u,function(e){return e.id()})).on("commsError",function(e,t){f.commsError(e,t)}),this.ddlUrl()[0]==="["||this.ddlUrl()[0]==="{"?this.marshaller.parse(this.ddlUrl(),function(){l()}):this.marshaller.url(this.ddlUrl(),function(){l()}),this},u.prototype.commsError=function(e,t){alert("Comms Error:\n"+e+"\n"+t)},u});