# মুহাইমিন — Dairy & Animal Products Management System

## Branding
- Main App: মুহাইমিন
- Dairy Business: মুহাইমিন ডেইরি
- System: Dairy & Animal Products Management System

## Included
- Supabase-connected mobile web app
- Farmer mobile number + direct Call button
- Milk collection with generated `milk_value` handled correctly
- Default milk purchase rate: ৳50/L
- Feed default: ৳50/kg
- Feed options: গোয়ালা ফিড, নারিশ, ACI Feed, Provita Feed, Fresh Feed, অন্যান্য
- Veterinary company starter list
- Agro Care product management
- DD-MM-YYYY display
- PWA manifest + service worker

## Deployment
Upload the contents of this folder to the `main` branch of the `muhaimin-dairy` repository, keeping `index.html` at the repository root. Then enable GitHub Pages from Settings → Pages → Deploy from a branch → main → /(root).

## Supabase
Run `supabase-setup.sql` in Supabase SQL Editor before first use if the database is not already configured.

Never publish a Supabase service-role/secret key in frontend code.
