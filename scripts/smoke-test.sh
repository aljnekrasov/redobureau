#!/usr/bin/env bash
# Smoke test for the split-sites deployment.
# Run after each deploy to verify the expected per-host behavior.
#
# Usage:
#   scripts/smoke-test.sh          # tests both
#   scripts/smoke-test.sh com      # tests only redobureau.com
#   scripts/smoke-test.sh ru       # tests only redobureau.ru
#
# Exits 0 if all checks pass, 1 otherwise.

set -u

COM_HOST="${COM_HOST:-https://redobureau.com}"
RU_HOST="${RU_HOST:-https://redobureau.ru}"

PASS=0
FAIL=0

assert() {
    local description="$1"
    local condition="$2"
    if eval "$condition" >/dev/null 2>&1; then
        echo "  PASS  $description"
        PASS=$((PASS + 1))
    else
        echo "  FAIL  $description"
        echo "        condition: $condition"
        FAIL=$((FAIL + 1))
    fi
}

fetch_status() {
    curl -s -o /dev/null -w '%{http_code}' "$@"
}

fetch_redirect() {
    curl -s -o /dev/null -w '%{redirect_url}' "$@"
}

fetch_body() {
    curl -s "$@"
}

test_com() {
    echo
    echo "=== redobureau.com ($COM_HOST) ==="

    assert "GET / returns 2xx or 3xx" \
        "[ \$(fetch_status -L '$COM_HOST/') -lt 400 ]"

    assert "GET /en/ returns 200" \
        "[ \$(fetch_status '$COM_HOST/en/') = 200 ]"

    assert "GET /ru/ 301s to redobureau.ru (hard domain separation)" \
        "fetch_redirect '$COM_HOST/ru/' | grep -q 'redobureau\\.ru'"

    assert "GET /es/ returns 200" \
        "[ \$(fetch_status '$COM_HOST/es/') = 200 ]"

    assert "HTML on .com does NOT load Yandex Metrika" \
        "! fetch_body '$COM_HOST/en/' | grep -q 'mc\\.yandex\\.ru'"

    assert "hreflang ru on .com points cross-domain to redobureau.ru" \
        "fetch_body '$COM_HOST/en/' | grep 'hreflang=\"ru\"' | grep -q 'https://redobureau\\.ru'"

    assert "HTML on .com declares hreflang for es" \
        "fetch_body '$COM_HOST/en/' | grep -q 'hreflang=\"es\"'"

    assert "Language switcher renders hidden RU button" \
        "fetch_body '$COM_HOST/en/' | grep -q 'data-lang=\"ru\"'"
}

test_ru() {
    echo
    echo "=== redobureau.ru ($RU_HOST) ==="

    assert "GET / redirects (3xx) to /ru" \
        "[ \$(fetch_status '$RU_HOST/') -ge 300 ] && [ \$(fetch_status '$RU_HOST/') -lt 400 ]"

    assert "GET /ru/ returns 200" \
        "[ \$(fetch_status '$RU_HOST/ru/') = 200 ]"

    assert "GET /en/ 301s cross-domain to redobureau.com" \
        "fetch_redirect '$RU_HOST/en/' | grep -q 'redobureau\\.com'"

    assert "GET /es/work 301s cross-domain to redobureau.com" \
        "fetch_redirect '$RU_HOST/es/work' | grep -q 'redobureau\\.com'"

    # Panel is disabled via 'panel' => false: Kirby's own panel route
    # returns null, the request falls through and ends in a redirect home.
    # Anything that is not a 200 panel screen counts as pass.
    assert "GET /panel does NOT serve the panel (non-200)" \
        "[ \$(fetch_status '$RU_HOST/panel') != 200 ]"

    assert "GET /panel/login does NOT serve the panel (non-200)" \
        "[ \$(fetch_status '$RU_HOST/panel/login') != 200 ]"

    assert "HTML on .ru loads Yandex Metrika" \
        "fetch_body '$RU_HOST/ru/' | grep -q 'mc\\.yandex\\.ru'"

    assert "HTML on .ru declares hreflang for ru" \
        "fetch_body '$RU_HOST/ru/' | grep -q 'hreflang=\"ru\"'"
}

target="${1:-both}"

case "$target" in
    com)  test_com ;;
    ru)   test_ru ;;
    both) test_com; test_ru ;;
    *)
        echo "Usage: $0 [com|ru|both]"
        exit 2
        ;;
esac

echo
echo "=== Summary ==="
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
echo

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
