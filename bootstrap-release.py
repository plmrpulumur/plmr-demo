import base64,hashlib,io,json,os,pathlib,shutil,subprocess,tempfile,zipfile
r=pathlib.Path.cwd(); m=json.loads((r/"payload/manifest.json").read_text()); parts=[]
for x in m:
 b=(r/x["path"]).read_bytes()
 assert len(b)==x["length"]
 assert hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()==x["sha"]
 t="".join(b.decode("ascii").splitlines());assert len(t)==x["base64_chars"];parts.append(t)
z=base64.b64decode("".join(parts),validate=True)
assert hashlib.sha256(z).hexdigest()=="c4548d9b0936dbe4765132ba4bddc5830f5c21d3c65929d7af835bef58d3aab3"
with tempfile.TemporaryDirectory() as tmp:
 d=pathlib.Path(tmp)
 with zipfile.ZipFile(io.BytesIO(z)) as archive:
  for x in archive.infolist():
   p=pathlib.PurePosixPath(x.filename)
   assert not p.is_absolute() and ".." not in p.parts and "\\" not in x.filename
   assert ((x.external_attr >> 16) & 0o170000)!=0o120000
  archive.extractall(d)
 for required in ["index.html","package.json",".github/workflows/pages.yml"]:assert (d/required).is_file()
 subprocess.run(["git","rm","-r","--ignore-unmatch","."],check=True)
 for x in r.iterdir():
  if x.name==".git":continue
  shutil.rmtree(x) if x.is_dir() else x.unlink()
 for x in d.iterdir():
  shutil.copytree(x,r/x.name) if x.is_dir() else shutil.copy2(x,r/x.name)
 (r/"supabase.public.json").write_text(json.dumps({"supabaseUrl":os.environ["PLMR_SUPABASE_URL"],"supabasePublishableKey":os.environ["PLMR_SUPABASE_PUBLISHABLE_KEY"]},indent=2)+"\n")
 subprocess.run(["git","add","-A"],check=True)
 subprocess.run(["git","diff","--cached","--check"],check=True)
 subprocess.run(["git","config","user.name","github-actions[bot]"],check=True)
 subprocess.run(["git","config","user.email","41898282+github-actions[bot]@users.noreply.github.com"],check=True)
 subprocess.run(["git","commit","-m","Deploy PLMR_FinalProcess_v10"],check=True)
 subprocess.run(["git","push","origin","HEAD:main"],check=True)
print("V10 source verified and uploaded")
