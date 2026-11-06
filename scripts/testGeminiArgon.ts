import 'dotenv/config';
import { geminiKeyManager } from '../src/services/geminiKeyManager';
import { geminiArgonService } from '../src/services/geminiArgonService';

async function main() {
  console.log('\n======================================================');
  console.log('🚀 TESTADOR DO POOL DE CONTAS - GEMINI 4 ARGON');
  console.log('======================================================\n');

  // Recarrega as chaves do ambiente
  geminiKeyManager.initKeys();

  const totalKeys = geminiKeyManager.getSlotCount();
  console.log(`📊 Total de contas detectadas: ${totalKeys}`);

  if (totalKeys === 0) {
    console.error('\n❌ Nenhuma chave configurada!');
    console.error('👉 Adicione suas chaves no arquivo .env:');
    console.error('   GEMINI_KEY_1=AIzaSy...');
    console.error('   GEMINI_KEY_2=AIzaSy...');
    console.error('   GEMINI_KEY_3=AIzaSy...');
    console.error('   GEMINI_KEY_4=AIzaSy...');
    console.error('   GEMINI_KEY_5=AIzaSy...');
    process.exit(1);
  }

  console.log('\n🔍 Testando conectividade de cada conta individualmente...');
  const results = await geminiArgonService.testAllKeys('gemini-2.5-flash'); // Teste rápido de ping com Flash ou Argon

  console.log('\n------------------------------------------------------');
  results.forEach(res => {
    const icon = res.status === 'online' ? '✅' : res.status === 'rate_limited' ? '⏳' : '❌';
    console.log(
      `${icon} ${res.accountLabel} (${res.maskedKey}) | Status: ${res.status.toUpperCase()} | Latência: ${res.latencyMs}ms`
    );
    if (res.error) {
      console.log(`   └─ Erro: ${res.error}`);
    }
  });
  console.log('------------------------------------------------------\n');

  const onlineCount = results.filter(r => r.status === 'online').length;
  console.log(`✨ Contas operacionais: ${onlineCount}/${totalKeys}`);

  if (onlineCount > 0) {
    console.log('\n🤖 Testando requisição com rotação automática no Gemini...');
    try {
      const response = await geminiArgonService.generateText({
        prompt: 'Escreva uma frase épica e engraçada de um cachorro vira-lata caramelo correndo atrás de motoqueiro.',
        model: 'gemini-2.5-flash', // Usa modelo padrão de teste
      });

      console.log('\n🎉 Resposta Recebida:');
      console.log(`"${response.text.trim()}"`);
      console.log(`\n📌 Atendido por: ${response.usedAccount} (${response.maskedKey})`);
    } catch (err: any) {
      console.error('❌ Erro na geração com rotação:', err.message);
    }
  }

  console.log('\n📈 Estatísticas Finais do Pool:');
  console.dir(geminiKeyManager.getStats(), { depth: null });
}

main().catch(err => {
  console.error('Falha geral no script:', err);
});
