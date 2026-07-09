# DATABASE

## users

id

agency_id

firstname

lastname

email

role

created_at

---

## agencies

id

name

logo

created_at

---

## projects

id

agency_id

advisor_id

seller_name

status

created_at

updated_at

---

## properties

id

project_id

address

city

zipcode

surface

land_surface

rooms

bedrooms

bathrooms

year

energy_rating

description

photos

latitude

longitude

---

## comparables

id

project_id

address

price

surface

rooms

distance

status

days_online

price_drop

photos

comment

display_order

---

## meeting_scripts

id

project_id

json

version

created_at

---

## seller_answers

id

project_id

question_key

answer

created_at

---

## perception_results

id

project_id

psychological_competitor

best_value

recommended_price

market_understanding

json

created_at

---

## reports

id

project_id

json

ppt_url

pdf_url

created_at

---

# Relations

Agency

↓

Users

↓

Projects

↓

Property

↓

Comparables

↓

Meeting Script

↓

Seller Answers

↓

Perception Results

↓

Report

---

# RLS

Agency Isolation

Toutes les données sont limitées à agency_id.

Aucune donnée n'est visible entre deux agences.
