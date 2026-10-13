import os
import sys

# Встроенная копия PyYAML (папка vendor) — на случай, если на хостинге её нет.
_vendor = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vendor")
if os.path.isdir(_vendor) and _vendor not in sys.path:
    sys.path.append(_vendor)
