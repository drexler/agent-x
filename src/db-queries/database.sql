 -- List all databases on a connected instance
select
    name = sysdb.name
from
   sys.databases sysdb
