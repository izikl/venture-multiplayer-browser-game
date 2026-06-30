// Privacy-friendly, cookieless page analytics via Azure Application Insights
// (resource: prospect-web-analytics, RG Prospect). The connection string below is a
// write-only client telemetry ingestion key, safe to ship in static pages (same model
// as a Google Analytics measurement id). Cookieless, so no consent banner is required.
(function () {
  var CONN = 'InstrumentationKey=2a20094f-0efb-4199-8a31-7d0e250f42b0;IngestionEndpoint=https://israelcentral-0.in.applicationinsights.azure.com/;LiveEndpoint=https://israelcentral.livediagnostics.monitor.azure.com/;ApplicationId=6ca7d38d-58cc-493d-8223-b580b12f83fb';
  var s = document.createElement('script');
  s.src = 'https://js.monitor.azure.com/scripts/b/ai.3.gbl.min.js';
  s.crossOrigin = 'anonymous';
  s.async = true;
  s.onload = function () {
    try {
      if (!window.Microsoft || !window.Microsoft.ApplicationInsights) return;
      var ai = new Microsoft.ApplicationInsights.ApplicationInsights({
        config: {
          connectionString: CONN,
          disableCookiesUsage: true,
          enableAutoRouteTracking: true
        }
      });
      ai.loadAppInsights();
      ai.trackPageView();
      window.appInsights = ai;
    } catch (e) { /* analytics must never break the page */ }
  };
  document.head.appendChild(s);
})();
