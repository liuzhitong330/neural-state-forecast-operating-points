(function () {
  "use strict";

  var cfg = window.KNOT_CONFIG;
  var rawBase = "https://raw.githubusercontent.com/khambhati-lab/pub-2024-hippocampal-seizure-forecasting/" + cfg.commit + "/";
  var colors = { fc: "#176b75", iea: "#9a7226", shuffled: "#98958d", ink: "#181817", muted: "#77756f", grid: "#deddd8" };
  var state = { auc: [], curves: {}, patients: [], selected: "NP19", budget: 0.10 };
  var SVGNS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs, text) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function parseCSV(text) {
    var rows = [], row = [], field = "", quoted = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i], next = text[i + 1];
      if (c === '"' && quoted && next === '"') { field += '"'; i++; }
      else if (c === '"') quoted = !quoted;
      else if (c === "," && !quoted) { row.push(field); field = ""; }
      else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && next === "\n") i++;
        row.push(field); field = "";
        if (row.some(function (value) { return value !== ""; })) rows.push(row);
        row = [];
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    var headers = rows.shift();
    return rows.map(function (values) {
      var item = {};
      headers.forEach(function (header, index) { item[header] = values[index]; });
      return item;
    });
  }

  function number(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function curveKey(patient, model) { return patient + "||" + model; }

  function buildEnvelope(points) {
    var bestByFpr = {};
    points.forEach(function (point) {
      if (point.fpr === null || point.tpr === null) return;
      bestByFpr[point.fpr] = Math.max(bestByFpr[point.fpr] === undefined ? -Infinity : bestByFpr[point.fpr], point.tpr);
    });
    var curve = Object.keys(bestByFpr).map(Number).sort(function (a, b) { return a - b; }).map(function (fpr) { return { fpr: fpr, tpr: bestByFpr[fpr] }; });
    var running = 0;
    curve.forEach(function (point) { running = Math.max(running, point.tpr); point.tpr = running; });
    return curve;
  }

  function interpolate(curve, target) {
    if (!curve.length) return null;
    if (target <= curve[0].fpr) return curve[0].tpr;
    for (var i = 0; i < curve.length - 1; i++) {
      var left = curve[i], right = curve[i + 1];
      if (target >= left.fpr && target <= right.fpr) {
        if (right.fpr === left.fpr) return Math.max(left.tpr, right.tpr);
        var fraction = (target - left.fpr) / (right.fpr - left.fpr);
        return left.tpr + fraction * (right.tpr - left.tpr);
      }
    }
    return curve[curve.length - 1].tpr;
  }

  function valuesFor(patient, budget) {
    return {
      fc: interpolate(state.curves[curveKey(patient, "FC-Based Model")], budget),
      iea: interpolate(state.curves[curveKey(patient, "IEA Cycle-Based Model")], budget),
      shuffled: interpolate(state.curves[curveKey(patient, "Shuffled Baseline")], budget)
    };
  }

  function pct(value, digits) { return (value * 100).toFixed(digits === undefined ? 1 : digits) + "%"; }
  function mean(values) { return values.reduce(function (a, b) { return a + b; }, 0) / values.length; }

  function selectPatient(patient) {
    state.selected = patient;
    document.getElementById("patient-select").value = patient;
    renderAll();
    var target = document.getElementById("operating-point");
    if (window.innerWidth < 650) target.scrollIntoView({ behavior: "smooth" });
  }

  function drawAuc() {
    var svg = document.getElementById("auc-scatter");
    svg.innerHTML = "";
    var W = 620, H = 430, L = 64, R = 22, T = 22, B = 55, min = .4, max = .95;
    function x(v) { return L + (v - min) / (max - min) * (W - L - R); }
    function y(v) { return T + (max - v) / (max - min) * (H - T - B); }
    [.4, .5, .6, .7, .8, .9].forEach(function (tick) {
      svg.appendChild(svgEl("line", { x1:L, y1:y(tick), x2:W-R, y2:y(tick), stroke:colors.grid, "stroke-width":1 }));
      svg.appendChild(svgEl("line", { x1:x(tick), y1:T, x2:x(tick), y2:H-B, stroke:colors.grid, "stroke-width":1 }));
      svg.appendChild(svgEl("text", { x:L-9, y:y(tick)+4, "text-anchor":"end", "font-size":11, "font-family":"system-ui", fill:colors.muted }, tick.toFixed(1)));
      svg.appendChild(svgEl("text", { x:x(tick), y:H-B+18, "text-anchor":"middle", "font-size":11, "font-family":"system-ui", fill:colors.muted }, tick.toFixed(1)));
    });
    svg.appendChild(svgEl("line", { x1:x(min), y1:y(min), x2:x(max), y2:y(max), stroke:colors.ink, "stroke-dasharray":"5 4", "stroke-width":1 }));
    svg.appendChild(svgEl("text", { x:(L+W-R)/2, y:H-9, "text-anchor":"middle", "font-size":12, "font-family":"system-ui", fill:colors.muted }, "IEA cycle-based model AUC"));
    svg.appendChild(svgEl("text", { x:15, y:(T+H-B)/2, "text-anchor":"middle", "font-size":12, "font-family":"system-ui", fill:colors.muted, transform:"rotate(-90 15 " + ((T+H-B)/2) + ")" }, "FC-based model AUC"));
    state.auc.forEach(function (row) {
      var selected = row.patient === state.selected;
      var point = svgEl("circle", { cx:x(row.iea), cy:y(row.fc), r:selected ? 7 : 5, fill:selected ? colors.ink : colors.fc, opacity:selected ? 1 : .72, tabindex:0, role:"button", "aria-label":row.patient + ", FC AUC " + row.fc.toFixed(3) + ", IEA AUC " + row.iea.toFixed(3) });
      point.appendChild(svgEl("title", {}, row.patient + ": FC " + row.fc.toFixed(3) + ", IEA " + row.iea.toFixed(3)));
      point.addEventListener("click", function () { selectPatient(row.patient); });
      point.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") selectPatient(row.patient); });
      svg.appendChild(point);
      if (selected) svg.appendChild(svgEl("text", { x:x(row.iea)+9, y:y(row.fc)-8, "font-size":11, "font-family":"system-ui", fill:colors.ink, "font-weight":700 }, row.patient));
    });
    var fcMean = mean(state.auc.map(function (d) { return d.fc; }));
    var ieaMean = mean(state.auc.map(function (d) { return d.iea; }));
    var wins = state.auc.filter(function (d) { return d.fc > d.iea; }).length;
    var selectedRow = state.auc.find(function (d) { return d.patient === state.selected; });
    document.getElementById("auc-readout").innerHTML = "Across 15 participants, mean AUC is <strong>" + fcMean.toFixed(3) + "</strong> for FC and <strong>" + ieaMean.toFixed(3) + "</strong> for IEA cycles. FC is higher in <strong>" + wins + "/15</strong> participants. " + state.selected + " has FC AUC " + selectedRow.fc.toFixed(3) + " and IEA AUC " + selectedRow.iea.toFixed(3) + ".";
  }

  function drawBars() {
    var svg = document.getElementById("tpr-bars");
    svg.innerHTML = "";
    var values = valuesFor(state.selected, state.budget);
    var models = [
      { label:"FC snapshot", value:values.fc, color:colors.fc },
      { label:"IEA cycle", value:values.iea, color:colors.iea },
      { label:"Shuffled", value:values.shuffled, color:colors.shuffled }
    ];
    var W=620, H=270, L=112, R=35, T=20, rowH=66, max=.75;
    [0,.25,.5,.75].forEach(function (tick) {
      var x=L+tick/max*(W-L-R);
      svg.appendChild(svgEl("line", { x1:x, y1:T, x2:x, y2:H-42, stroke:colors.grid }));
      svg.appendChild(svgEl("text", { x:x, y:H-21, "text-anchor":"middle", "font-size":11, "font-family":"system-ui", fill:colors.muted }, pct(tick,0)));
    });
    models.forEach(function (model, index) {
      var y=T+index*rowH+18;
      svg.appendChild(svgEl("text", { x:L-10, y:y+5, "text-anchor":"end", "font-size":12, "font-family":"system-ui", fill:colors.ink }, model.label));
      svg.appendChild(svgEl("rect", { x:L, y:y-13, width:Math.max(1, model.value/max*(W-L-R)), height:26, fill:model.color, opacity:.9 }));
      svg.appendChild(svgEl("text", { x:L+model.value/max*(W-L-R)+7, y:y+5, "font-size":12, "font-family":"system-ui", fill:colors.ink, "font-weight":700 }, pct(model.value,1)));
    });
    svg.appendChild(svgEl("text", { x:(L+W-R)/2, y:H-2, "text-anchor":"middle", "font-size":11, "font-family":"system-ui", fill:colors.muted }, "True-positive rate at selected FPR ceiling"));
    var delta = values.fc - values.iea;
    var winner = delta >= 0 ? "FC snapshot" : "IEA cycle";
    document.getElementById("patient-readout").innerHTML = "For <strong>" + state.selected + "</strong> at an FPR ceiling of <strong>" + pct(state.budget,0) + "</strong>, the " + winner + " model retains more sensitivity: FC " + pct(values.fc,1) + " versus IEA " + pct(values.iea,1) + " (difference " + (delta>=0?"+":"") + pct(delta,1) + ").";
  }

  function drawRanks() {
    var rows = state.patients.map(function (patient) {
      var v = valuesFor(patient, state.budget);
      return { patient:patient, fc:v.fc, iea:v.iea, shuffled:v.shuffled, delta:v.fc-v.iea };
    }).sort(function (a,b) { return b.delta-a.delta; });
    var maxAbs = Math.max.apply(null, rows.map(function (row) { return Math.abs(row.delta); }));
    var box = document.getElementById("rank-list"); box.innerHTML="";
    rows.forEach(function (row) {
      var item=document.createElement("div"); item.className="rank-row"+(row.patient===state.selected?" active":"");
      var width=Math.abs(row.delta)/maxAbs*50;
      item.innerHTML="<span>"+row.patient+"</span><span class=\"track\"><i class=\"zero\"></i><i class=\"delta "+(row.delta>=0?"pos":"neg")+"\" style=\"width:"+width+"%\"></i></span><span class=\"rank-value\">"+(row.delta>=0?"+":"")+pct(row.delta,1)+"</span>";
      item.addEventListener("click",function(){selectPatient(row.patient);}); box.appendChild(item);
    });
    var wins=rows.filter(function(row){return row.delta>0;}).length;
    var fcMean=mean(rows.map(function(row){return row.fc;}));
    var ieaMean=mean(rows.map(function(row){return row.iea;}));
    var shMean=mean(rows.map(function(row){return row.shuffled;}));
    document.getElementById("cohort-readout").innerHTML="At an FPR ceiling of <strong>"+pct(state.budget,0)+"</strong>, FC preserves more sensitivity in <strong>"+wins+"/15</strong> participants. Mean TPR is "+pct(fcMean,1)+" for FC, "+pct(ieaMean,1)+" for IEA cycles, and "+pct(shMean,1)+" for the shuffled baseline.";
  }

  function renderAll() { drawAuc(); drawBars(); drawRanks(); }

  function initialize(aucRows, rocRows) {
    state.auc = aucRows.map(function (row) { return { patient:row.NP_code, fc:number(row["FC-Based Model"]), iea:number(row["IEA Cycle-Based Model"]) }; });
    var grouped={};
    rocRows.forEach(function (row) {
      var key=curveKey(row.NP_code,row.Model);
      if(!grouped[key]) grouped[key]=[];
      grouped[key].push({fpr:number(row.fpr),tpr:number(row.tpr)});
    });
    Object.keys(grouped).forEach(function(key){state.curves[key]=buildEnvelope(grouped[key]);});
    state.patients=state.auc.map(function(row){return row.patient;}).sort(function(a,b){return Number(a.slice(2))-Number(b.slice(2));});
    var select=document.getElementById("patient-select");
    state.patients.forEach(function(patient){var option=document.createElement("option");option.value=patient;option.textContent=patient;select.appendChild(option);});
    select.value=state.selected;
    select.addEventListener("change",function(){state.selected=select.value;renderAll();});
    var slider=document.getElementById("fpr-slider");
    slider.addEventListener("input",function(){state.budget=Number(slider.value)/100;document.getElementById("budget-value").textContent=slider.value+"%";drawBars();drawRanks();});
    document.getElementById("commit-link").href=cfg.repository+"/tree/"+cfg.commit;
    document.getElementById("source-status").innerHTML="Loaded <strong>"+aucRows.length+" participant AUC rows</strong> and <strong>"+rocRows.length+" ROC points</strong> from commit <a href=\""+cfg.repository+"/tree/"+cfg.commit+"\">"+cfg.commit.slice(0,8)+"</a>.";
    renderAll();
  }

  Promise.all([
    fetch(rawBase+cfg.files.auc).then(function(response){if(!response.ok)throw new Error("AUC source returned "+response.status);return response.text();}),
    fetch(rawBase+cfg.files.roc).then(function(response){if(!response.ok)throw new Error("ROC source returned "+response.status);return response.text();})
  ]).then(function(texts){initialize(parseCSV(texts[0]),parseCSV(texts[1]));}).catch(function(error){
    document.getElementById("source-status").className="source-status error";
    document.getElementById("source-status").textContent="Source data could not be loaded: "+error.message;
    document.getElementById("auc-readout").className="readout error";
    document.getElementById("auc-readout").textContent="The interactive analysis needs access to the pinned public GitHub source files.";
  });
})();
