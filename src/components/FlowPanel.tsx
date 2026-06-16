import { formatNumber } from "@/lib/time";
import { TOOLTIPS } from "@/lib/glossary";
import type { SummaryJson } from "@/lib/types";

interface FlowPanelProps {
  summary: SummaryJson;
  data: {
    flow_buy_ratio?: number | null;
    flow_aggressiveness?: number | null;
    flow_event_count?: number | null;
    flow_net_delta_gex_bn?: number | null;
    event_risk_score?: number | null;
    net_delta_bn?: number | null;
    net_charm_bn?: number | null;
    net_vanna_bn?: number | null;
  };
}

export function FlowPanel({ summary, data }: FlowPanelProps) {
  const buyRatio = data.flow_buy_ratio ?? summary.flow_buy_ratio;
  const aggressiveness = data.flow_aggressiveness ?? summary.flow_aggressiveness;
  const events = data.flow_event_count ?? summary.flow_event_count;
  const flowGex = data.flow_net_delta_gex_bn ?? summary.flow_net_delta_gex_bn;
  const eventRisk = data.event_risk_score ?? summary.event_risk_score;
  const netDelta = data.net_delta_bn ?? summary.net_delta_bn;
  const netCharm = summary.net_charm_bn;
  const netVanna = summary.net_vanna_bn;

  return (
    <div className="card">
      <h3>Flow &amp; Greeks</h3>
      <dl className="glossary metric-list">
        <dt title={TOOLTIPS.flowBuyRatio}>Flow buy ratio</dt>
        <dd>{formatNumber(buyRatio as number | undefined, 2)}</dd>
        <dt title={TOOLTIPS.flowAggressiveness}>Flow aggressiveness</dt>
        <dd>{formatNumber(aggressiveness as number | undefined, 1)}</dd>
        <dt title={TOOLTIPS.flowEvents}>Flow events</dt>
        <dd>{formatNumber(events as number | undefined, 0)}</dd>
        <dt title={TOOLTIPS.flowNetDeltaGex}>Flow net Δ GEX</dt>
        <dd>{formatNumber(flowGex as number | undefined, 5)}</dd>
        <dt title={TOOLTIPS.eventRisk}>Event risk</dt>
        <dd>{formatNumber(eventRisk as number | undefined, 2)}</dd>
        <dt title={TOOLTIPS.netDelta}>Net delta (Bn)</dt>
        <dd>{formatNumber(netDelta as number | undefined, 2)}</dd>
        <dt title={TOOLTIPS.netCharm}>Net charm (Bn)</dt>
        <dd>{formatNumber(netCharm as number | undefined, 2)}</dd>
        <dt title={TOOLTIPS.netVanna}>Net vanna (Bn)</dt>
        <dd>{formatNumber(netVanna as number | undefined, 2)}</dd>
      </dl>
    </div>
  );
}
