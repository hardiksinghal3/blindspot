#!/usr/bin/env python3
"""Dev helper: open a URL in the local Chrome over CDP, optionally run JS and take a screenshot.
usage: cdp.py URL [--js EXPR] [--shot FILE] [--wait SEC] [--size WxH]"""
import asyncio, json, sys, base64, argparse, urllib.request, websockets
ap = argparse.ArgumentParser(); ap.add_argument('url'); ap.add_argument('--js'); ap.add_argument('--shot'); ap.add_argument('--wait', type=float, default=2); ap.add_argument('--size', default='1366x850'); ap.add_argument('--full', action='store_true'); ap.add_argument('--after', type=float, default=0.3)
a = ap.parse_args()
async def main():
    tab = json.load(urllib.request.urlopen(urllib.request.Request("http://localhost:29229/json/new?about:blank", method="PUT")))
    async with websockets.connect(tab["webSocketDebuggerUrl"], max_size=None) as ws:
        i = 0; logs = []
        async def call(method, params=None):
            nonlocal i; i += 1; my = i
            await ws.send(json.dumps({"id": my, "method": method, "params": params or {}}))
            while True:
                m = json.loads(await ws.recv())
                if m.get("id") == my: return m
                if m.get("method") == "Runtime.exceptionThrown": logs.append("EXC " + json.dumps(m["params"]["exceptionDetails"].get("exception", {}).get("description", m["params"]["exceptionDetails"].get("text")))[:400])
                if m.get("method") == "Runtime.consoleAPICalled" and m["params"]["type"] in ("error", "warning"): logs.append("CONSOLE " + " ".join(str(x.get("value", x.get("description"))) for x in m["params"]["args"])[:400])
                if m.get("method") == "Log.entryAdded" and m["params"]["entry"]["level"] == "error": logs.append("LOG " + m["params"]["entry"]["text"][:300] + " " + m["params"]["entry"].get("url", ""))
        w, h = map(int, a.size.split('x'))
        await call("Runtime.enable"); await call("Log.enable"); await call("Page.enable")
        await call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 1, "mobile": False})
        await call("Page.navigate", {"url": a.url})
        await asyncio.sleep(a.wait)
        if a.js:
            r = await call("Runtime.evaluate", {"expression": a.js, "returnByValue": True, "awaitPromise": True})
            print(json.dumps(r["result"].get("result", {}).get("value", r["result"]), indent=1)[:6000])
        await asyncio.sleep(a.after)
        if a.shot:
            p = {"format": "png"}
            if a.full: p["captureBeyondViewport"] = True
            r = await call("Page.captureScreenshot", p)
            open(a.shot, "wb").write(base64.b64decode(r["result"]["data"]))
        await call("Runtime.evaluate", {"expression": "1"})
        for l in logs: print(l)
    urllib.request.urlopen("http://localhost:29229/json/close/" + tab["id"])
asyncio.run(main())
