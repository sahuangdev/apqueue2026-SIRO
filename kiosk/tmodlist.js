process.stdout.write(process.moduleLoadList.filter(m=>m.includes('lectron')).join('|')+'\\n');
