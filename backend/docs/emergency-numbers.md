# Emergency Numbers Fixture

The Day-1 emergency picker uses a deliberately small verified fixture for the
Cape Town / Western Cape demo. The frontend chooses a service category; the
backend does not attempt GPS-to-jurisdiction matching.

| Service | Number | Coverage | Verification source |
|---|---|---|---|
| Healthcare / ambulance | 10177 | Western Cape / South Africa emergency medical services | Western Cape Government |
| Police | 10111 | South Africa | South African Police Service |
| Fire / general municipal emergency routing | 021 480 7700 | City of Cape Town | City of Cape Town Public Emergency Communication Centre |
| Mountain rescue | 021 937 0300 | Western Cape | Western Cape Government / Wilderness Search and Rescue |

Sources:

- https://www.westerncape.gov.za/know-who-you-can-call-emergency
- https://www.saps.gov.za/services/cc_10111.php
- https://resource.capetown.gov.za/documentcentre/Documents/Procedures%2C%20guidelines%20and%20regulations/About%20Public%20Emergency%20Communication.pdf

The app must show the number for confirmation and use the platform dialler. It
must never place an emergency call automatically.
