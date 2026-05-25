-- Prix d'entrée comparatif aligné sur Atlas F&A Starter (18 000 FCFA/mois, forfait socle)
update public.site_content
set data = jsonb_set(
      data,
      '{rows}',
      (
        select jsonb_agg(
          case when row->>'name' = 'Atlas Studio'
               then jsonb_set(row, '{values,0}', '"dès 18 000 FCFA/mois"'::jsonb)
               else row end
        )
        from jsonb_array_elements(data->'rows') as row
      )
    ),
    updated_at = now()
where key = 'comparatif';
