My personal fav is  'find' command in gitbash

1.switch the terminal to gitbash
```
Mani@DESKTOP-FHTPDKN MINGW64 /d/Dtu and doc/THE RISING PROJECT/implement this/electric-upi (mapper)
$ find . -not -path '*/.*' -not -path '*node_modules*' -not -path '*dist*' -not -path '*agent-project-readme*' -not -path '*.next*' -not -path '*supabase-backend-info*' | sed -e 's/[^-][^\/]*\// |/g' -e 's/|\([^ ]\)/|-- \1/'
o/p :
.
 |-- AGENTS.md
 |-- app
 | |-- actions
 | | |-- geocode.ts
 | |-- api
 | | |-- bookings
....
```
1.a using npx without install from direct public repo internet
$ npx tree-cli -d -o target --ignore "node_modules, .git, dist, agent-project-readme, .github, .next, supabase-backend-info"
Need to install the following packages:
tree-cli@0.6.7
Ok to proceed? (y) 
▁ 
D:\Dtu and doc\THE RISING PROJECT\implement this\electric-upi
├── app
├── components
├── garbageFolder
├── hooks
├── lib
├── MAPFUNCTIONALITY
├── public
├── scratch
└── supabase

2.'tree' command is not found in bash so use some other
Mani@DESKTOP-FHTPDKN MINGW64 /d/Dtu and doc/THE RISING PROJECT/implement this/electric-upi (mapper)
$ tree -l 3 ./app
bash: tree: command not found

Note: Asal me yeh tree-cli package ka ek chota sa bug/behavior hai. Jab aap tree-cli me target folder ke liye --base flag ka use nahi karte, toh yeh ./app ko sahi se parse nahi kar pata aur aapke system ke C: drive ya User profile (Documents, AppData, Temporary files) ki saari files ko read karne lagta hai. Isiliye woh hazaron files dikha raha hai.
1. tree-cli ka sahi syntax (Fixing the Bug)
(Yahan --base ./app lagane se yeh fix ho jayega aur sirf app ke andar ka maal dikhayega)
huge too many irrelevent files also shown

hence use this command
 find app/ -not -path '*/.*' | sed -e 's/[^-][^\/]*\// |/g' -e 's/|\([^ ]\)/|-- \1/'
 |
 |-- actions
 | |-- geocode.ts
 |-- api
 | |-- bookings
 | | |-- driver
 | | | |-- route.ts
....
 |-- login
 | |-- login-theme.module.css
 | |-- LoginClient.tsx
 | |-- page.tsx
 | |-- update-password
 | | |-- page.tsx


Mani@DESKTOP-FHTPDKN MINGW64 /d/Dtu and doc/THE RISING PROJECT/implement this/electric-upi (mapper)
$ 
3.Show only tracked files
```$ git ls-files app/```
o/p:
$ git ls-files app/
app/LandingPageClient.tsx
app/actions/geocode.ts
app/api/bookings/[id]/accept/route.ts
...

4. if you need to do it too many times make aliasing
alias treeapp="find app/ -not -path '*/.*' | sed -e 's/[^-][^\/]*\// |/g' -e 's/|\([^ ]\)/|-- \1/'"
hence now 
Mani@DESKTOP-FHTPDKN MINGW64 /d/Dtu and doc/THE RISING PROJECT/implement this/electric-upi (mapper)
$ alias treeapp="find app/ -not -path '*/.*' | sed -e 's/[^-][^\/]*\// |/g' -e 's/|\([^ ]\)/|-- \1/'"

Mani@DESKTOP-FHTPDKN MINGW64 /d/Dtu and doc/THE RISING PROJECT/implement this/electric-upi (mapper)
$ treeapp
 | <--  you made app/ hence ye automatically app dir ke ander ke sari cheje dikha dega 
 |-- actions
 | |-- geocode.ts
 |-- api
 | |-- bookings
 | | |-- driver
 | | | |-- route.ts
 | | |-- host
 | | | |-- route.ts
 | | |-- route.ts
 | | |-- [id]
