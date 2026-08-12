(function (root) {
  'use strict';
  const round = value => Math.round((Number(value) || 0) * 1000) / 1000;
  const keyFor = item => [item.profileCode, item.color || '', item.surface || ''].join('|');

  function expandCuts(cutItems) {
    const result = [];
    (cutItems || []).forEach(item => {
      const quantity = Math.max(0, Math.trunc(Number(item.quantity) || 0));
      for (let index = 0; index < quantity; index += 1) {
        result.push({
          cutInstanceId: `${item.itemId || item.sourceRule || item.profileCode}-${String(index + 1).padStart(3, '0')}`,
          itemId: item.itemId,
          profileCode: item.profileCode,
          profileName: item.profileName,
          positionNo: item.positionNo,
          cutLength: Number(item.cutLength),
          color: item.color || '',
          surface: item.surface || '',
          sourceRule: item.sourceRule || '',
          notes: item.notes || ''
        });
      }
    });
    return result.sort((a, b) => b.cutLength - a.cutLength || String(a.positionNo).localeCompare(String(b.positionNo), 'tr') || String(a.sourceRule).localeCompare(String(b.sourceRule)) || String(a.cutInstanceId).localeCompare(String(b.cutInstanceId)));
  }

  function optimize(cutItems, stockItems) {
    const cuts = expandCuts(cutItems);
    const stocks = (stockItems || []).map((item, index) => ({
      ...item,
      _index: index,
      availableQuantity: Math.max(0, Math.trunc(Number(item.availableQuantity) || 0)),
      stockLength: Number(item.stockLength),
      kerf: Number(item.kerf) || 0,
      startTrim: Number(item.startTrim) || 0,
      endTrim: Number(item.endTrim) || 0,
      minimumReusableOffcut: Number(item.minimumReusableOffcut) || 0
    })).sort((a, b) => keyFor(a).localeCompare(keyFor(b)) || a.stockLength - b.stockLength || a._index - b._index);
    const bars = [];
    const unassignedCuts = [];

    function barRemaining(bar) { return round(bar.usableLength - bar.usedLength); }
    cuts.forEach(cut => {
      const compatibleStocks = stocks.filter(stock => keyFor(stock) === keyFor(cut));
      const neededFor = stock => round(cut.cutLength + stock.kerf);
      const candidates = bars.filter(bar => keyFor(bar) === keyFor(cut) && barRemaining(bar) >= round(cut.cutLength + bar.kerf));
      candidates.sort((a, b) => (barRemaining(a) - (cut.cutLength + a.kerf)) - (barRemaining(b) - (cut.cutLength + b.kerf)) || a.barNo - b.barNo);
      let target = candidates[0];
      if (!target) {
        const stock = compatibleStocks.find(item => item.availableQuantity > (item._used || 0) && (item.stockLength - item.startTrim - item.endTrim) >= neededFor(item));
        if (!stock) {
          unassignedCuts.push({ ...cut, reason: compatibleStocks.length ? 'STOCK_SHORTAGE_OR_LENGTH' : 'STOCK_PROFILE_COLOR_MISMATCH' });
          return;
        }
        stock._used = (stock._used || 0) + 1;
        target = {
          barNo: bars.length + 1,
          stockItemId: stock.stockItemId,
          stockCode: stock.stockCode,
          profileCode: stock.profileCode,
          profileName: stock.profileName,
          stockLength: stock.stockLength,
          color: stock.color,
          surface: stock.surface,
          kerf: stock.kerf,
          startTrim: stock.startTrim,
          endTrim: stock.endTrim,
          minimumReusableOffcut: stock.minimumReusableOffcut,
          usableLength: round(stock.stockLength - stock.startTrim - stock.endTrim),
          usedLength: 0,
          cuts: []
        };
        bars.push(target);
      }
      target.cuts.push(cut);
      target.usedLength = round(target.usedLength + cut.cutLength + target.kerf);
    });

    bars.forEach(bar => {
      bar.kerfTotal = round(bar.cuts.length * bar.kerf);
      bar.cutLengthTotal = round(bar.cuts.reduce((sum, cut) => sum + cut.cutLength, 0));
      bar.remaining = barRemaining(bar);
      bar.reusableOffcut = bar.remaining >= bar.minimumReusableOffcut ? bar.remaining : 0;
      bar.waste = bar.remaining < bar.minimumReusableOffcut ? bar.remaining : 0;
      bar.totalConsumed = round(bar.startTrim + bar.endTrim + bar.usedLength);
    });

    const assignedCount = bars.reduce((sum, bar) => sum + bar.cuts.length, 0);
    const neededByProfile = {};
    const assignedByProfile = {};
    cuts.forEach(cut => { const key = keyFor(cut); neededByProfile[key] = (neededByProfile[key] || 0) + 1; });
    bars.forEach(bar => bar.cuts.forEach(cut => { const key = keyFor(cut); assignedByProfile[key] = (assignedByProfile[key] || 0) + 1; }));
    const shortage = Object.entries(neededByProfile).map(([key, required]) => ({ key, required, assigned: assignedByProfile[key] || 0, shortage: required - (assignedByProfile[key] || 0) })).filter(item => item.shortage > 0);
    return {
      algorithm: 'DETERMINISTIC_BEST_FIT_DECREASING_V1',
      totalCuts: cuts.length,
      assignedCuts: assignedCount,
      unassignedCount: unassignedCuts.length,
      stockBarsUsed: bars.length,
      bars,
      shortage,
      unassignedCuts,
      conservationValid: cuts.length === assignedCount + unassignedCuts.length,
      kerfTotal: round(bars.reduce((sum, bar) => sum + bar.kerfTotal, 0)),
      wasteTotal: round(bars.reduce((sum, bar) => sum + bar.waste, 0)),
      reusableOffcutTotal: round(bars.reduce((sum, bar) => sum + bar.reusableOffcut, 0))
    };
  }

  root.PulumurDeterministicCutOptimizer = { optimize, expandCuts, keyFor };
  if (typeof module !== 'undefined') module.exports = root.PulumurDeterministicCutOptimizer;
})(typeof window !== 'undefined' ? window : globalThis);
