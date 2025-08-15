import { ref } from 'vue';

export const phpProjectRoot = ref('');
export const phpProjectIndex = ref({ files: {}, symbols: { classes: {}, interfaces: {}, traits: {}, functions: {} }, namespaces: {} });
export const phpProjectProgress = ref({ processed: 0, total: 0, filePath: '' });

export function setPhpProject(root, index) {
  phpProjectRoot.value = root || '';
  phpProjectIndex.value = index || { files: {}, symbols: { classes: {}, interfaces: {}, traits: {}, functions: {} }, namespaces: {} };
}

export function setPhpProgress(progress) {
  phpProjectProgress.value = progress || { processed: 0, total: 0, filePath: '' };
}
