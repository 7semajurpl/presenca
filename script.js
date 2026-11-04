// URL da API do Google Apps Script
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzZuELZ7L9Y5_GWIOAAnTlR8H1uTkt3MARZlm2kw1tGSNUliGS45XX6jC9VzEoNdXeY6Q/exec";

const form = document.getElementById("attendanceForm");
const submitButton = document.getElementById("submitButton");
const message = document.getElementById("message");
const locationStatus = document.getElementById("locationStatus");

function showMessage(text, type) {
    message.textContent = text;
    message.className = "message " + type;
}

function setLoading(loading) {
    submitButton.disabled = loading;
    submitButton.textContent = loading
    ? "Enviando registro..."
    : "Registrar presença";
}

function getLocation() {
    return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
        reject(new Error(
        "Seu navegador não oferece suporte à geolocalização."
        ));
        return;
    }

    locationStatus.textContent = "Obtendo sua localização...";

    navigator.geolocation.getCurrentPosition(
        (position) => {
        locationStatus.textContent =
            "Localização obtida com sucesso.";

        resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
        });
        },

        (error) => {
        let errorMessage;

        switch (error.code) {
            case error.PERMISSION_DENIED:
            errorMessage =
                "Permissão de localização negada. Autorize o GPS no navegador.";
            break;

            case error.POSITION_UNAVAILABLE:
            errorMessage =
                "Não foi possível determinar sua localização.";
            break;

            case error.TIMEOUT:
            errorMessage =
                "Tempo limite para obter localização excedido.";
            break;

            default:
            errorMessage =
                "Ocorreu um erro ao obter sua localização.";
        }

        reject(new Error(errorMessage));
        },

        {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
        }
    );
    });
}

async function sendData(data) {
  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error("Falha de comunicação com o servidor (" + response.status + ").");
  }

  const result = await response.json();

  if (!result.sucesso) {
    throw new Error(result.mensagem || "O servidor não registrou a presença.");
  }

  return result;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    message.className = "message";
    message.textContent = "";

    const nome = document.getElementById("nome").value.trim();
    const cpf = document.getElementById("cpf").value.trim();
    const atividade = document.getElementById("atividade").value;

    if (!nome || !cpf || !atividade) {
    showMessage(
        "Preencha todos os campos antes de continuar.",
        "error"
    );
    return;
    }

    setLoading(true);

    try {
    // Primeiro, obtém a localização do participante.
    const location = await getLocation();

    // Monta os dados enviados para o Apps Script.
    const payload = {
        nome: nome,
        cpf: cpf,
        atividade: atividade,
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy
    };

    locationStatus.textContent = "Enviando registro...";

    // Envia os dados para a API.
    const resultado = await sendData(payload);

    if (resultado.status && resultado.status.startsWith("VÁLIDO")) {
        showMessage("Presença registrada com sucesso!", "success");
    } else {
        showMessage(
            "Presença registrada, porém você está fora do local do evento. " +
            "A organização fará a conferência.",
            "info"
        );
    }

    locationStatus.textContent = "Envio concluído.";
    form.reset();

    } catch (error) {
    console.error("Erro no registro:", error);

    showMessage(
        error.message ||
        "Não foi possível enviar a solicitação. Tente novamente.",
        "error"
    );

    locationStatus.textContent =
        "Não foi possível concluir o envio.";

    } finally {
    setLoading(false);
    }
});
