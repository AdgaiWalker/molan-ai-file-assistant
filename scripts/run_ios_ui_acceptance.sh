#!/bin/zsh

set -euo pipefail

ROOT="$(cd "$(dirname "${0:A}")/.." && pwd)"
DEVELOPER_DIR="/Users/happy/Downloads/Xcode-beta.app/Contents/Developer"
JAVA_HOME="${JAVA_HOME:-/Users/happy/.cache/molan-toolchains/jdk17/jdk-17.0.19+10/Contents/Home}"
ANDROID_HOME="${ANDROID_HOME:-/Users/happy/Library/Android/sdk}"
SIMULATOR_NAME="${IOS_SIMULATOR_NAME:-iPhone 17 Pro}"
SIMULATOR_OS="${IOS_SIMULATOR_OS:-26.5}"
FIXTURE_NAME="normal.json"
FIXTURE="$ROOT/fixtures/mobile-reading/json/$FIXTURE_NAME"
DERIVED_DATA="$ROOT/native/iosApp/build/ios-ui-acceptance"

export DEVELOPER_DIR JAVA_HOME ANDROID_HOME

if [[ ! -x "$DEVELOPER_DIR/usr/bin/xcodebuild" ]]; then
  print -u2 "找不到固定 Xcode：$DEVELOPER_DIR"
  exit 1
fi
if [[ ! -x "$JAVA_HOME/bin/java" ]]; then
  print -u2 "找不到固定 JDK 17：$JAVA_HOME"
  exit 1
fi
if [[ ! -d "$ANDROID_HOME" ]]; then
  print -u2 "找不到固定 Android SDK：$ANDROID_HOME"
  exit 1
fi
if [[ ! -f "$FIXTURE" ]]; then
  print -u2 "缺少验收文件：$FIXTURE"
  exit 1
fi

UDID="${IOS_SIMULATOR_UDID:-$(
  xcrun simctl list devices available -j | python3 -c '
import json
import sys

payload = json.load(sys.stdin)
target_name = sys.argv[1]
target_runtime = "iOS-" + sys.argv[2].replace(".", "-")
for runtime, devices in payload["devices"].items():
    if runtime.endswith(target_runtime):
        for device in devices:
            if device["name"] == target_name:
                print(device["udid"])
                raise SystemExit(0)
raise SystemExit(1)
' "$SIMULATOR_NAME" "$SIMULATOR_OS"
)}"

if [[ -z "$UDID" ]]; then
  print -u2 "找不到 $SIMULATOR_NAME（iOS $SIMULATOR_OS）模拟器。"
  exit 1
fi

xcrun simctl boot "$UDID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$UDID" -b

FILES_GROUP="$(xcrun simctl get_app_container "$UDID" com.apple.DocumentsApp groups |
  awk -F '\t' '$1 == "group.com.apple.FileProvider.LocalStorage" { print $2 }')"
if [[ -z "$FILES_GROUP" ]]; then
  print -u2 "找不到系统“文件”App 的本地存储容器。"
  exit 1
fi
FILES_STORAGE="$FILES_GROUP/File Provider Storage"
mkdir -p "$FILES_STORAGE"
cp "$FIXTURE" "$FILES_STORAGE/$FIXTURE_NAME"

xcrun simctl uninstall "$UDID" com.molan.reader >/dev/null 2>&1 || true

xcodebuild -quiet \
  -project "$ROOT/native/iosApp/Molan.xcodeproj" \
  -scheme Molan \
  -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath "$DERIVED_DATA" \
  -only-testing:MolanUITests/MolanLaunchUITests/testOpenDocumentFromSystemFilePicker \
  test

APP_GROUP="$(xcrun simctl get_app_container \
  "$UDID" \
  com.molan.reader \
  group.com.molan.reader)"
METADATA="$(find "$APP_GROUP/ShareInbox" -name metadata.json -type f -print -quit)"

if [[ -z "$METADATA" ]] || ! grep -q "\"originalName\":\"$FIXTURE_NAME\"" "$METADATA"; then
  print -u2 "UI 已执行，但 Share Extension 未写入预期 App Group 队列。"
  exit 1
fi

RESULT="$(find "$DERIVED_DATA/Logs/Test" -maxdepth 1 -name '*.xcresult' -print | sort | tail -1)"
print "iOS UI 验收通过"
print "设备：$SIMULATOR_NAME / iOS $SIMULATOR_OS / $UDID"
print "文件选择器：$FIXTURE_NAME"
print "Share Extension：$METADATA"
print "结果：$RESULT"
