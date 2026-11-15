T = 'Slide title: one sentence that states the point'
L = 'One supporting line, 20 words at most.'
F = 'Source or caveat for this slide'
C = [
 dict(kicker='Event · challenge name', title='Project', sub='One-line promise of the project', lead='Two sentences: who it is for and what it does.', path='signal time', links=[('Live demo', 'public link'), ('Code', 'repository link'), ('Team', 'names')], foot=F),
 dict(kicker='1 · The problem', title=T, lead=L, stats=[('Figure', 'What the figure means, in one sentence.', 'Source')] * 3, strip='The takeaway that leads into the idea.', foot=F),
 dict(kicker='2 · The idea', title=T, lead=L, steps=[('Step name', 'What happens in this step.')] * 4,
      example=dict(label='Example result', status='STATUS', felt='00', measured='00', gap='+00', m=20, f=70, note='What the app tells the astronaut to do.', cap='Caption'), foot=F),
 dict(kicker='3 · Demo: the check', title=T, lead=L, img_note='Screenshot from the live app', cap='Caption', steps=[('Test name', 'What it measures and how.')] * 5, foot=F),
 dict(kicker='4 · Demo: the mission', title=T, lead=L, img_note='Screenshot from the live app', cap='Caption', points=[('Callout', 'What to notice in the screenshot.')] * 3, foot=F),
 dict(kicker='5 · NASA data and science', title=T, lead=L, cards=[('Source', 'Dataset or standard', 'What it is and what the app does with it.')] * 4, strip='Which numbers are NASA limits and which are prototype settings.', foot=F),
 dict(kicker='6 · Limits and next steps', title=T, lead=L, cols=[('Limits', ['Point'] * 3), ('Next', ['Point'] * 3), ('SI disclosure', ['Point'] * 2)], links=[('Live demo', 'public link'), ('Code', 'repository link')], foot=F),
]
