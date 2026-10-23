# Shared Fuel Market feed

`market.py` collects public pages, including same-site relevant news links,
and sends the collected text to OpenRouter. It uses no paid search plugin.
The primary free model is `nvidia/nemotron-3-ultra-550b-a55b:free`, with free-only
fallback routes `nvidia/nemotron-3-super-120b-a12b:free` and `google/gemma-4-31b-it:free`. It never falls
back to a paid model. If free endpoints are unavailable, the previous report stays.

Configure repository secret `OPENROUTER_API_KEY`, then run **Shared market
bulletin**. Prices are checked at minutes 7 and 37 each hour. Each AI group
is attempted at most once every four hours. GitHub can
delay schedules; the app must display the report timestamp and expiry.
The persistent budget caps this pipeline at 42 attempted requests per Vietnam
calendar day. Other apps using the same API key may consume the remaining quota.

The root `agri.json` retains existing fields and adds `sharedMarket`:
groups, checkedAt, history, budget, errors. Each group preserves its last good
result and timestamps if collection or AI fails. No failed call extends freshness.
Do not enable client migration until a manual run and report review succeed.

Validation rejects invented price/date evidence, future dates, wrong units,
incorrect fuel region columns and conflicting numeric quotes. This validates
extraction, not the truth of every publisher or AI narrative. Forecasts are
conditional commentary, never authoritative prices. Sparse/blocked sources
must remain explicit. Model output is displayed as text, never executable HTML.

The workflow only publishes `agri.json`. Signing keys are not used by Actions.
Tests: `python3 -m unittest discover -s server -p 'test_*.py'`.

The model now selects immutable evidence IDs for each factual paragraph. The compiler builds citations and bibliography, checks numeric tokens against selected evidence, and rejects numerical forecasts. This is a grounding check, not a proof of semantic entailment. Raw encrypted domestic gold payloads are only sent to the native parser, not interpreted as news. Publishing merges groups by timestamp onto a fresh main branch, preserving unrelated data. A prompt revision can retry a group once within the existing daily request budget.
