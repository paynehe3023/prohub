import json, time, urllib.request, uuid
from pathlib import Path
base='http://localhost:3000/video-worker'
tests=[
 ('vedio1字幕','D:\\pythonWorkspace\\prohub\\test-videos\\test_vedio1_zimu.mp4',['subtitle','transcript']),
 ('vedio2BGM','D:\\pythonWorkspace\\prohub\\test-videos\\test_vedio2_bgm.mp4',['bgm']),
 ('vedio3纯BGM','D:\\pythonWorkspace\\prohub\\test-videos\\test_vedio3_onlyBgm.mp4',['bgm']),
]

def submit(path,tasks):
    video=Path(path); boundary='----Prohub'+uuid.uuid4().hex; parts=[]
    for name,value in [('tasks',json.dumps(tasks)),('whisper_model','small')]:
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    parts.append((f'--{boundary}\r\nContent-Disposition: form-data; name="video"; filename="{video.name}"\r\nContent-Type: video/mp4\r\n\r\n').encode()+video.read_bytes()+b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode()); body=b''.join(parts)
    req=urllib.request.Request(base+'/jobs',data=body,method='POST',headers={'Content-Type':f'multipart/form-data; boundary={boundary}','Content-Length':str(len(body))})
    with urllib.request.urlopen(req,timeout=90) as r: return json.loads(r.read())['id']

def poll(job):
    url=base+'/jobs/'+job; last=None
    for _ in range(300):
        with urllib.request.urlopen(url,timeout=30) as r: data=json.loads(r.read())
        state=(data.get('status'),data.get('progress'),data.get('stage'))
        if state != last: print('STATE',job,*state,flush=True); last=state
        if data.get('status') in ('completed','failed','cancelled'): return data
        time.sleep(2)
    return data

for label,path,tasks in tests:
    print('START',label,Path(path).name,'TASKS',tasks,flush=True)
    job=submit(path,tasks); print('JOB',label,job,flush=True)
    data=poll(job); result=data.get('result') or {}; subs=result.get('subtitles') or {}; trans=result.get('transcript') or {}; bgm=result.get('bgm') or {}; audio=bgm.get('audio') or {}
    print('RESULT',json.dumps({'label':label,'job':job,'status':data.get('status'),'progress':data.get('progress'),'error':data.get('error'),'subtitle_items':len(subs.get('items') or []),'transcript_segments':len(trans.get('segments') or []),'transcript_language':trans.get('language'),'bgm_segments':len(bgm.get('segments') or []),'bgm_audio':audio.get('filename'),'bgm_audio_format':audio.get('format')},ensure_ascii=False),flush=True)