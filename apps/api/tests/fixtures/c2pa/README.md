# C2PA test fixtures

`C.jpg` and `CA.jpg` are official test images from the
[c2pa-rs](https://github.com/contentauth/c2pa-rs) project
(`sdk/tests/fixtures/`), Apache-2.0 licensed, used here unmodified to test
Module D's C2PA verification against real, validly signed manifests (signed
with C2PA's own test certificate — not a real content-authenticity claim
about the image itself). Not related to this project's AI-detection claims;
they exist purely to exercise `app/provenance/c2pa.py` against real C2PA
data instead of hand-rolled fixtures.
