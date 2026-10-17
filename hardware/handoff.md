# Step counter hardware project handoff

## Goal and requirements

Build a personal walking-step counter, eventually an ankle/leg band. First MVP: hold the connected hardware in one hand while walking. Count and retain steps outdoors without a phone, Wi-Fi, or internet. Upload stored counts to a cloud API when Wi-Fi becomes available. No requirement for live outdoor uploads was established. No hardware purchases or implementation have been confirmed.

## Agreed MVP shopping list

- 1 Adafruit ESP32 Feather V2 (Wi-Fi, onboard flash, LiPo connector and USB charging).
- 1 Adafruit LIS3DH accelerometer breakout, specifically the STEMMA QT version.
- 1 four-pin STEMMA QT cable, JST-SH to JST-SH; approximately 5–10 cm is suitable for prototyping.
- 1 Adafruit 3.7 V 500 mAh LiPo battery, product 1578, with compatible connector/polarity.
- 1 USB-C data cable (existing cable is fine if it supports data).

Strap, enclosure, mounting supplies, and other wearable fabrication items were explicitly removed from the MVP list. No separate battery charger or memory card is needed for the proposed prototype. Runtime has not been calculated or promised.

## Connections and power

```text
Computer / USB supply → USB-C cable → Feather USB-C port
LiPo battery plug → Feather 2-pin JST battery socket
Feather STEMMA QT socket → 4-pin STEMMA QT cable → LIS3DH STEMMA QT socket
```

The Feather charges the attached battery from USB and powers the sensor through the QT cable. Disconnect USB for portable operation. These connections need no soldering. Do not connect a single-cell LiPo directly to the 3.3 V pin: it can reach 4.2 V when full.

The user showed a Feather photo with a green circle around the small central four-pin connector. That is the STEMMA QT connector, NOT the battery connector. The battery connector is the larger cream-colored two-pin socket at the top left, directly above USB-C. The image need not be retained; use the official board guide below.

I²C uses power, ground, SDA (data), and SCL (clock), all carried by QT. The user typed “soa”; the assistant interpreted this as SDA, but this was not explicitly confirmed. If they actually mean SDO: in I²C mode it selects address, default 0x18, alternate 0x19. INT is an optional sensor OUTPUT notifying the ESP32 of motion/data-ready events, requiring an extra wire. Leave INT disconnected for the simple polling MVP.

## Programming discussion

Recommended beginner environment: Arduino IDE, with ESP32 board support and Adafruit LIS3DH library. Select Adafruit ESP32 Feather V2 and connect over USB-C data cable to upload. Language: C++ using the Arduino framework; sketches commonly use .ino files.

Flash application software onto the ESP32. The accelerometer is normally configured by the ESP32 rather than independently flashed. Open-source sensor libraries and step-counting implementations exist, but no specific step-counting project has been selected or verified. No code has been written, compiled, flashed, or tested.

Application still needs: read acceleration; detect steps; save totals offline; reconnect and upload to an unspecified cloud API. Credentials, endpoint, request format, retry/deduplication behavior, persistence frequency, and desired runtime remain undecided. The Feather V2 has switched QT sensor power; follow its board guide when implementing sensor initialization and sleep behavior.

## Accuracy and corrected claims

The LIS3DH measures acceleration; it does not automatically supply a walking step total. Step counting requires software and validation. Hand movement can affect handheld results, so use a consistent grip during testing. Moving to an ankle changes signal characteristics: an ankle cycle often corresponds to a stride/two steps, but do not blindly multiply all detected motion by two. Validate gait and reject nonwalking movement.

Earlier conversation included disagreement about ESP32-only counting. ESP32 PCNT counts electrical pulses supplied by a source; it does not itself sense footsteps. Wi-Fi CSI can detect human motion without an accelerometer in a suitable radio setup, but motion detection does not establish reliable step counting. CSI also does not satisfy this project's offline outdoor requirement. The selected approach is ESP32 plus accelerometer and battery.

The eventual band is feasible, but fit, sweat protection, battery life, and accuracy need work. A compact final wearable may benefit from a custom PCB after the prototype. Wi-Fi should generally stay off while walking and be enabled for later synchronization; exact power strategy is undecided.

## Sources / reference artifacts

No separate specs, code, plans, issues, commits, or other project artifacts were produced in this conversation.

- Feather V2 overview, pinout, charging, and Arduino setup: https://learn.adafruit.com/adafruit-esp32-feather-v2
- LIS3DH guide: https://learn.adafruit.com/adafruit-lis3dh-triple-axis-accelerometer-breakout
- LIS3DH pins: https://learn.adafruit.com/adafruit-lis3dh-triple-axis-accelerometer-breakout/pinouts
- Proposed battery: https://www.adafruit.com/product/1578
- ESP32 PCNT: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/pcnt.html
- CSI reference, only if revisiting that discussion: https://github.com/espressif/esp-csi

## Suggested skills

- Call the Skill tool for **keep-all-brief** if available: the user explicitly requested minimal replies throughout this chat. Explain one point at a time in simple language; expand only when asked.
- No other listed skill is required for the hardware/Arduino work. Use official Adafruit/Espressif documentation to verify board-specific details.

## Likely next work

Continue from the language/IDE discussion, guided by the user's next request. A useful first milestone is reading and displaying live LIS3DH acceleration through Arduino's serial monitor, then implementing and validating step counting. Do not assume the hardware has arrived or that the user has installed Arduino IDE. Avoid claiming a generic sensor example is already a complete pedometer.

No secrets, API credentials, or personal identifiers are included in this handoff.

codex://threads/01a14558-11f3-7541-8153-3ca9a590e642
