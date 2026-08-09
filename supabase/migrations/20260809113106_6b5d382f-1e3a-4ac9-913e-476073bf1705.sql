UPDATE public.conversations
SET ai_enabled = true, human_attention_required = true, status = 'open'
WHERE id = 'a3e7cd05-1b85-4c9d-88e2-7464dfc0ac5b';

DELETE FROM public.messages WHERE conversation_id = '36cc9a42-d5d3-4de6-9684-bd45fd873f65';
DELETE FROM public.conversations WHERE id = '36cc9a42-d5d3-4de6-9684-bd45fd873f65';