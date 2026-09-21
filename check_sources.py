"""Download accessible class PDFs, report content changes; never changes calendar itself."""
from pathlib import Path
from html.parser import HTMLParser
import urllib.request, json, hashlib, re
ROOT=Path(__file__).resolve().parent
CACHE=ROOT.parent/'sources'/'automatic'
SOURCES={
 'grade1-la':('1FBZ9QcojKQqlArU73VQItFoulVHAUuFT',r'^Unit'),
 'grade1-steam':('1oTfSorD_4ckz5jyNDljvE-JJTavx5mJN',r'.*'),
 'grade1-coding':('1NS8C_GjVTPchcXUxthhwLDeTXRzDwFlg',r'coding|數位|邏輯'),
 'grade2-la':('16F6Saq-wK5hPfFCKf061ZLjhqK5cuC8b',r'^Unit'),
 'grade2-steam':('1S5oeMCo7EBCEqmdPcr2V5IXoLlTiLC2e',r'STEAM'),
}
class Files(HTMLParser):
 def __init__(self):super().__init__();self.files={}
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);name=a.get('aria-label','');key=a.get('data-id')
  if key and name:self.files[key]=name
  match=re.search(r'5:auSv138:([\w-]+)-0-16',a.get('ssk',''))
  if match and name:self.files[match[1]]=name
def fetch(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=60) as r:return r.read()
def main():
 CACHE.mkdir(parents=True,exist_ok=True)
 manifest=CACHE/'manifest.json'
 previous=json.loads(manifest.read_text()) if manifest.exists() else {}
 current=dict(previous);report=[]
 for source,(folder,pattern) in SOURCES.items():
  try:
   parser=Files();parser.feed(fetch('https://drive.google.com/drive/folders/'+folder).decode())
   found=0
   for file_id,label in parser.files.items():
    name=re.sub(r' PDF(?: Shared)?$','',label)
    if '.pdf' not in name.lower() or not re.search(pattern,name,re.I):continue
    found+=1;data=fetch('https://drive.google.com/uc?export=download&id='+file_id)
    if not data.startswith(b'%PDF'):raise ValueError('Download is not PDF: '+name)
    digest=hashlib.sha256(data).hexdigest();key=source+':'+file_id
    target=CACHE/(source+'-'+file_id+'.pdf');target.write_bytes(data)
    current[key]={'name':name,'sha256':digest,'path':str(target),'folder':folder}
    report.append({'source':source,'file':name,'changed':previous.get(key,{}).get('sha256')!=digest,'path':str(target)})
   if not found:report.append({'source':source,'error':'No matching PDFs found; preserve current calendar and check access/layout.'})
  except Exception as error:report.append({'source':source,'error':str(error)})
 manifest.write_text(json.dumps(current,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
