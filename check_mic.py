import pyaudio
p = pyaudio.PyAudio()
print(f"Device count: {p.get_device_count()}")
for i in range(p.get_device_count()):
    info = p.get_device_info_by_index(i)
    print(f"Device {i}: {info.get('name')} (Input: {info.get('maxInputChannels')})")
p.terminate()
