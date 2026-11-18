"""Run Hacktron's unmodified hfw_report.main(), counting HTTP statuses of verdict calls."""
import collections, json, sys, time, importlib.util
spec = importlib.util.spec_from_file_location("hfw_report", sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
counts = collections.Counter(); orig = m.http_get_json
def wrapped(url, timeout, *retry):
    # Retries recurse through this name with a third argument; count only the final
    # status of each lookup (the outer call from probe()).
    s, b, e = orig(url, timeout, *retry)
    if not retry:
        counts[s] += 1
    return s, b, e
m.http_get_json = wrapped
t = time.time(); rc = m.main()
print("STATUS_COUNTS", json.dumps(dict(counts)), "rc", rc, "secs", round(time.time() - t, 1))
